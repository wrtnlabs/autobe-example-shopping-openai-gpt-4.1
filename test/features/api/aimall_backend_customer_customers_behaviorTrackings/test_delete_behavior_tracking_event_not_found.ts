import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate deletion failure of a non-existent behavioral tracking event.
 *
 * Business context: Behavioral tracking events are historical action records
 * for each customer. Deleting by a non-existent behaviorTrackingId must not
 * succeed, must not delete anything, and must provide clear feedback (e.g., 404
 * or equivalent) so UIs and integrators can handle gracefully.
 *
 * Test Steps:
 *
 * 1. Create a customer account (prerequisite).
 * 2. Attempt to delete a behavior tracking record with a randomly generated,
 *    guaranteed non-existent behaviorTrackingId (UUID) for this customer (since
 *    no tracking is created at all).
 * 3. Expect API to respond with an error (404 not found / resource not found) and
 *    verify that no data is removed, the system remains stable, and an
 *    appropriate error is thrown.
 * 4. Use TestValidator.error() to check error-throwing behavior, but do NOT check
 *    error messages or types.
 */
export async function test_api_aimall_backend_customer_customers_behaviorTrackings_test_delete_behavior_tracking_event_not_found(
  connection: api.IConnection,
) {
  // 1. Create a customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: null,
      },
    },
  );
  typia.assert(customer);

  // 2. Attempt to delete a non-existent behavior tracking event
  await TestValidator.error("delete fails for non-existent behaviorTrackingId")(
    async () => {
      await api.functional.aimall_backend.customer.customers.behaviorTrackings.erase(
        connection,
        {
          customerId: customer.id,
          behaviorTrackingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
