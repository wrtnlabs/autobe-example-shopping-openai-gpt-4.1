import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Admin advanced search/filter on customer behavior trackings.
 *
 * This test validates the admin's ability to filter a customer's behavioral
 * tracking events with custom criteria:
 *
 * - By event_type
 * - By precise time window
 * - And to verify pagination details.
 *
 * Business flow:
 *
 * 1. Create a new customer (with unique email/phone)
 * 2. Register several behavior events for that customer (different event_type,
 *    distinct timestamps)
 * 3. Perform a PATCH search filtering on event_type and narrow time window,
 *    expecting only matching event(s) and correct pagination
 * 4. Search with wider filter (all events, small page limit), and validate
 *    pagination metadata and result count
 *
 * Validates correct implementation of:
 *
 * - Backend customer creation
 * - Behavior event logging (create)
 * - Advanced filter API (search) by event_type, time range, pagination
 * - Schema presence, filtering, paging behaviors
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_search_behavior_trackings_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Create unique customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: "dummyhash1",
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Register behavior events (different event_types, times)
  const now = new Date();
  const eventTypes = ["login", "add_cart", "checkout"];
  const timestamps = [
    new Date(now.getTime() - 60 * 60 * 1000), // 1hr ago
    new Date(now.getTime() - 30 * 60 * 1000), // 30min ago
    new Date(now.getTime() - 10 * 60 * 1000), // 10min ago
  ];
  const createdEvents: IAIMallBackendBehaviorTracking[] = [];
  for (let i = 0; i < eventTypes.length; ++i) {
    const behavior =
      await api.functional.aimall_backend.administrator.customers.behaviorTrackings.create(
        connection,
        {
          customerId: customer.id,
          body: {
            event_type: eventTypes[i],
            event_data: JSON.stringify({ info: `e${i}` }),
            occurred_at: timestamps[i].toISOString(),
          } satisfies IAIMallBackendBehaviorTracking.ICreate,
        },
      );
    typia.assert(behavior);
    createdEvents.push(behavior);
  }

  // 3. Search with event_type filter and tight time window (should match only "add_cart")
  const filterIdx = 1;
  const filterType = eventTypes[filterIdx];
  const dateFrom = new Date(
    timestamps[filterIdx].getTime() - 60 * 1000,
  ).toISOString(); // 1min before
  const dateTo = new Date(
    timestamps[filterIdx].getTime() + 60 * 1000,
  ).toISOString(); // 1min after
  const searchRes1 =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: {
          event_type: filterType,
          date_from: dateFrom,
          date_to: dateTo,
        },
      },
    );
  typia.assert(searchRes1);
  TestValidator.equals("filtered result count")(searchRes1.data.length)(1);
  TestValidator.equals("event_type matches")(searchRes1.data[0].event_type)(
    filterType,
  );
  TestValidator.equals("pagination record count")(
    searchRes1.pagination.records,
  )(1);
  TestValidator.equals("pagination pages")(searchRes1.pagination.pages)(1);

  // 4. Broad search (no event_type), limit:2, expect pagination (2+1 over 2 pages)
  const searchRes2 =
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: {
          limit: 2,
        },
      },
    );
  typia.assert(searchRes2);
  TestValidator.equals("broader search result length")(searchRes2.data.length)(
    2,
  );
  TestValidator.equals("pagination total records")(
    searchRes2.pagination.records,
  )(3);
  TestValidator.equals("pagination total pages")(searchRes2.pagination.pages)(
    2,
  );
}
