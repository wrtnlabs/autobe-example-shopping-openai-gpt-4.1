import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate enforcement of strict access control for DELETE
 * /aimall-backend/administrator/customers/{customerId}/behaviorTrackings/{behaviorTrackingId}
 * so that only admins (or potentially the record's owner) may delete behavioral
 * tracking records, while normal customers are strictly forbidden.
 *
 * This test ensures privilege barriers are effective:
 *
 * 1. Register a typical (non-admin) customer using the official SDK, verifying
 *    account creation.
 * 2. As this customer, attempt to invoke the administration-only DELETE endpoint
 *    with the customer's own id and a random behavior tracking ID.
 * 3. Confirm that the API strictly blocks the operation with an authorization
 *    error, proving the access control layer works as intended.
 *
 * Note: If underlying records do not exist, the test's interest is solely
 * access denial, so random UUIDs are permitted for behaviorTrackingId.
 *
 * Steps:
 *
 * 1. Register a new customer (non-admin)
 * 2. As this user, attempt DELETE on a behavior tracking record
 * 3. Expect an error (unauthorized/forbidden); privilege barrier must block
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_test_admin_delete_behavior_tracking_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new customer (non-admin)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Attempt DELETE on a behavior tracking record using this customer's id (as a non-admin)
  await TestValidator.error(
    "Non-admin cannot delete behavior tracking records",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.erase(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
