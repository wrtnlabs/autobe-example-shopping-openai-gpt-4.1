import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";
import type { IPageIAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendBehaviorTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate paginated search behavior at the pagination boundary for a
 * customer's behavioral tracking events.
 *
 * This test ensures that, when a client requests pagination parameters
 * (page/limit) such that the requested page is beyond the available event data,
 * the API returns an empty data array, appropriate pagination metadata
 * (reflecting counts and page range), and no errors or data leakage. It also
 * ensures that ordinary event creation and search works as expected before
 * hitting the edge case.
 *
 * Test Process:
 *
 * 1. Register (create) a new customer.
 * 2. Log a known number (e.g., 7) of behavioral events for the customer.
 * 3. Search for events using valid pagination to verify that event creation and
 *    normal pagination work as expected.
 * 4. Search with page/limit values that push the requested page just beyond the
 *    total available (e.g., if 7 events, request page=3 with limit=4 gives
 *    offset=8).
 * 5. Assert that the returned data array is empty, and pagination metadata
 *    (current page, limit, records, pages) is correct.
 * 6. Ensure no error or sensitive data leakage occurs, and type assertions for all
 *    structures.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_search_behavior_trackings_pagination_edge_case(
  connection: api.IConnection,
) {
  // 1. Register a new customer.
  const createCustomerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: createCustomerInput },
  );
  typia.assert(customer);

  // 2. Log 7 behavior tracking events for this customer.
  const eventTypes = [
    "login",
    "add_cart",
    "view_product",
    "checkout",
    "recommend_click",
    "logout",
    "purchase",
  ];
  for (let i = 0; i < eventTypes.length; ++i) {
    const eventInput: IAIMallBackendBehaviorTracking.ICreate = {
      event_type: eventTypes[i],
      event_data: JSON.stringify({ payload: i }),
      occurred_at: new Date(Date.now() - i * 60000).toISOString(),
    };
    const event =
      await api.functional.aimall_backend.customer.customers.behaviorTrackings.create(
        connection,
        {
          customerId: customer.id,
          body: eventInput,
        },
      );
    typia.assert(event);
  }

  // 3. Search using normal pagination (page=1, limit=4): should get 4 events.
  const normalResult =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: { page: 1, limit: 4 },
      },
    );
  typia.assert(normalResult);
  TestValidator.equals("Normal pagination: data length")(
    normalResult.data.length,
  )(4);
  TestValidator.equals("Normal pagination: total records")(
    normalResult.pagination.records,
  )(7);
  TestValidator.equals("Normal pagination: total pages")(
    normalResult.pagination.pages,
  )(2);

  // 4. Edge: Search for a page past available data (page=3, limit=4) => offset 8, only 7 present.
  const edgeResult =
    await api.functional.aimall_backend.customer.customers.behaviorTrackings.search(
      connection,
      {
        customerId: customer.id,
        body: { page: 3, limit: 4 },
      },
    );
  typia.assert(edgeResult);
  TestValidator.equals("Edge page should be empty")(edgeResult.data.length)(0);
  TestValidator.equals("Edge page: total records")(
    edgeResult.pagination.records,
  )(7);
  TestValidator.equals("Edge page: total pages")(edgeResult.pagination.pages)(
    2,
  );
  TestValidator.equals("Edge page: current page")(
    edgeResult.pagination.current,
  )(3);
  TestValidator.equals("Edge page: limit")(edgeResult.pagination.limit)(4);
}
