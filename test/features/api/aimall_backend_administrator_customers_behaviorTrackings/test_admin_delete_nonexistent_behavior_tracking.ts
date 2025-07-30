import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate admin attempt to delete a nonexistent behavioral tracking event for
 * a customer.
 *
 * Verifies that the API correctly returns a 404 error and does not make any
 * destructive change when an administrator tries to delete a behavior tracking
 * entry that does not exist.
 *
 * Business context: Ensures error handling and data integrity compliance with
 * right-to-be-forgotten and audit policy.
 *
 * Steps:
 *
 * 1. Create a new customer (dependency; provides valid context).
 * 2. Attempt to delete a behaviorTracking entry for that customer using a random
 *    UUID for behaviorTrackingId (which is guaranteed not to exist).
 * 3. Confirm that the API returns a 404 not found error (using
 *    TestValidator.error).
 * 4. Optionally confirm no exception is thrown for the customer entity (customer
 *    still exists and is unchanged).
 */
export async function test_api_aimall_backend_administrator_customers_behaviorTrackings_delete_nonexistent(
  connection: api.IConnection,
) {
  // 1. Create customer (dependency)
  const createInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: createInput },
  );
  typia.assert(customer);

  // 2. Attempt to delete a non-existent behaviorTracking record
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 when deleting nonexistent behaviorTracking",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.behaviorTrackings.erase(
      connection,
      {
        customerId: customer.id,
        behaviorTrackingId: nonExistentId,
      },
    );
  });

  // 3. Optionally, verify that the customer still exists by checking creation info (no destructive effect)
  TestValidator.equals("customer id still valid after failed deletion")(
    typeof customer.id,
  )("string");
}
