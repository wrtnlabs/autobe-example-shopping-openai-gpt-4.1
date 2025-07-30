import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendBehaviorTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendBehaviorTracking";

/**
 * Validates proper 404 error handling when updating a non-existent behavioral
 * tracking event as an administrator.
 *
 * This test ensures that if an admin attempts to update a behavioral tracking
 * event for a customer with an ID (behaviorTrackingId) that does not exist in
 * the database, the API responds with an appropriate not found (404) error and
 * does not modify any unrelated data.
 *
 * Steps:
 *
 * 1. Create a customer (dependency step).
 * 2. Try to update a behavioral tracking event using a random, non-existent
 *    behaviorTrackingId for that customer.
 * 3. Verify that the API call fails with a 404 Not Found error.
 * 4. (Optional) Confirm there is no unintended side effect (not feasible to check
 *    in this test due to lack of listing APIs for behaviorTrackings, so skip
 *    this step).
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_update_behavior_tracking_not_found(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Prepare a random, non-existent behaviorTrackingId
  const nonExistentBehaviorTrackingId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to update a behavior tracking record for this customer with non-existent ID
  await TestValidator.error("404 expected for non-existent behaviorTrackingId")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.behaviorTrackings.update(
        connection,
        {
          customerId: customer.id,
          behaviorTrackingId: nonExistentBehaviorTrackingId,
          body: {
            event_type: "view_product",
            event_data: '{"action":"view","productId":"prod-123"}',
          } satisfies IAIMallBackendBehaviorTracking.IUpdate,
        },
      );
    },
  );
}
