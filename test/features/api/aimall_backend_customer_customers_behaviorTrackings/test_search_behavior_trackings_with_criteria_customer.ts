import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test filtered, paginated search for a customer's behavioral tracking records
 * as the owner.
 *
 * This scenario ensures that the PATCH endpoint for searching customer behavior
 * tracking events correctly applies filtering by event_type, date range, and
 * handles pagination.
 *
 * Steps:
 *
 * 1. Create a new test customer.
 * 2. Insert multiple behavior tracking events for the customer (with various
 *    event_types and occurred_at values).
 * 3. Choose a specific event_type (e.g., "add_cart") and a set of date range
 *    values covering a subset of the inserted events.
 * 4. Perform a search (PATCH) with these filter criteria, setting limit = 2 to
 *    test pagination.
 * 5. Assert that only the matching records by event_type and within the date range
 *    are returned.
 * 6. Assert that the pagination metadata (current, limit, records, pages) is
 *    present and correct.
 * 7. Optionally, test with a page=2 parameter if more than two matches exist and
 *    validate results/pagination.
 *
 * Edge cases:
 *
 * - Filtering by event_type only (no date range)
 * - Filtering by date range only (no event_type)
 * - No matching records (expect empty data and proper pagination)
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_search_with_criteria_customer(
  connection: api.IConnection,
) {
  // 1. Create a test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Insert multiple tracking events with varied event_type and occurred_at
  const eventTypes = ["view_product", "add_cart", "checkout", "login"];
  const baseDate = new Date();
  const allEvents = await ArrayUtil.asyncRepeat(6)(async (i) => {
    // Distribute events across types/dates
    const event_type = eventTypes[i % eventTypes.length];
    const occurred_at = new Date(
      baseDate.getTime() - i * 1000 * 60 * 5,
    ).toISOString(); // spaced by 5min
    return api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type,
          event_data: JSON.stringify({ example: true, index: i }),
          occurred_at,
        } satisfies IAIMallBackendBehaviorTracking.ICreate,
      },
    );
  });
  allEvents.forEach((ev) => typia.assert(ev));

  // 3. Choose event_type and date range for filter
  const filterType = "add_cart";
  // Find all matching events
  const matchingEvents = allEvents.filter((e) => e.event_type === filterType);
  if (matchingEvents.length === 0)
    throw new Error(
      "Test setup failed: expected at least one 'add_cart' event",
    );
  // Sort by occurred_at DESC
  matchingEvents.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  // Take a date range covering all matching events for robust filtering
  const date_from = matchingEvents[matchingEvents.length - 1].occurred_at;
  const date_to = matchingEvents[0].occurred_at;

  // 4. PATCH (search) by event_type + date range, paginated (limit = 2)
  const pageLimit = 2;
  const page1 =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: filterType,
          date_from,
          date_to,
          page: 1,
          limit: pageLimit,
        } satisfies IAIMallBackendBehaviorTracking.IRequest,
      },
    );
  typia.assert(page1);
  // Data records must only include correct event_type and be within range
  page1.data.forEach((ev) => {
    TestValidator.equals("filtered event_type")(ev.event_type)(filterType);
    TestValidator.predicate("date >= date_from")(ev.occurred_at >= date_from);
    TestValidator.predicate("date <= date_to")(ev.occurred_at <= date_to);
  });
  // Pagination should reflect settings and matching count
  TestValidator.equals("pagination.limit")(page1.pagination.limit)(pageLimit);
  TestValidator.equals("pagination.current")(page1.pagination.current)(1);
  TestValidator.predicate("pagination.records >= data.length")(
    page1.pagination.records >= page1.data.length,
  );

  // 5. Optionally test page=2 if more results exist
  if (matchingEvents.length > pageLimit) {
    const page2 =
      await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
        connection,
        {
          customerId: customer.id,
          body: {
            event_type: filterType,
            date_from,
            date_to,
            page: 2,
            limit: pageLimit,
          },
        },
      );
    typia.assert(page2);
    // Ensure that events are not duplicated between page1 and page2
    const page1Ids = page1.data.map((e) => e.id);
    page2.data.forEach((ev) => {
      TestValidator.predicate("no duplicate ids in pagination")(
        !page1Ids.includes(ev.id),
      );
      TestValidator.equals("filtered event_type")(ev.event_type)(filterType);
      TestValidator.predicate("date >= date_from")(ev.occurred_at >= date_from);
      TestValidator.predicate("date <= date_to")(ev.occurred_at <= date_to);
    });
  }

  // 6. Edge case: filter by event_type only
  const typeOnlyPage =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "checkout",
          limit: 5,
        },
      },
    );
  typia.assert(typeOnlyPage);
  typeOnlyPage.data.forEach((ev) =>
    TestValidator.equals("checkout type")(ev.event_type)("checkout"),
  );

  // 7. Edge case: filter by date range only
  const dateOnlyPage =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: {
          date_from: date_from,
          date_to: date_to,
          limit: 5,
        },
      },
    );
  typia.assert(dateOnlyPage);
  dateOnlyPage.data.forEach((ev) =>
    TestValidator.predicate("date in range")(
      ev.occurred_at >= date_from && ev.occurred_at <= date_to,
    ),
  );

  // 8. Edge: no matching filter (expect empty result)
  const noMatch =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: "nonexistent_type",
          limit: 3,
        },
      },
    );
  typia.assert(noMatch);
  TestValidator.equals("no match empty array")(noMatch.data.length)(0);
}
