import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deleting a non-existent customer account.
 *
 * This E2E test ensures that attempting to delete a customer account using an
 * invalid or already deleted customerId, as an administrator, results in the
 * correct error handling. Specifically, the API must respond with a 404 (Not
 * Found) error, and the operation must not have any side effects on other
 * records or system integrity. No actual customer records should be affected by
 * this failed operation.
 *
 * Process steps:
 *
 * 1. Generate a random UUID for customerId that does not correspond to any
 *    existing customer.
 * 2. Attempt to delete the customer account via the administrator erase API using
 *    the non-existent customerId.
 * 3. Verify that a 404 error is returned.
 * 4. (Optional, if feasible) Spot-check unrelated records to ensure no data was
 *    impacted (cannot be performed without more APIs).
 */
export async function test_api_aimall_backend_administrator_customers_test_delete_nonexistent_customer_account(
  connection: api.IConnection,
) {
  // Step 1: Generate a random, non-existent customerId (valid UUID format)
  const nonexistentCustomerId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt deletion and verify 404 error is thrown.
  await TestValidator.error("Deleting non-existent customer returns 404")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.erase(
        connection,
        {
          customerId: nonexistentCustomerId,
        },
      );
    },
  );

  // Step 4: NOTE: Without additional APIs, we cannot directly check for side effects on unrelated data.
}
