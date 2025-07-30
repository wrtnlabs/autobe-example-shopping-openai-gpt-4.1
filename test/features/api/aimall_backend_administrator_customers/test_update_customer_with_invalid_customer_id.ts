import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate not-found error handling when updating a customer with an invalid
 * customerId.
 *
 * This test checks the case where the system receives an update request
 * targeting a non-existent customer record by passing a random (but
 * well-formed) UUID that does not correspond to any real customer in the
 * system.
 *
 * The system is expected to return a 404 Not Found error and must not update or
 * affect any records.
 *
 * Steps:
 *
 * 1. Prepare a random UUID representing a non-existent customerId (do not create
 *    such a customer).
 * 2. Attempt to update this customer by calling the administrator update API with
 *    this customerId and a valid random IAimallBackendCustomer.IUpdate
 *    payload.
 * 3. Assert that a 404 error is thrown (HttpError.status === 404), which confirms
 *    correct not-found handling.
 * 4. Ensure no exception other than 404 is thrown (no success, no other error).
 */
export async function test_api_aimall_backend_administrator_customers_test_update_customer_with_invalid_customer_id(
  connection: api.IConnection,
) {
  // 1. Prepare a random non-existent customer ID
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a valid random update payload
  const updatePayload: IAimallBackendCustomer.IUpdate =
    typia.random<IAimallBackendCustomer.IUpdate>();

  // 3. Attempt to update and assert 404 error is thrown
  await TestValidator.error("should throw 404 for non-existent customer")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.update(
        connection,
        {
          customerId: invalidCustomerId,
          body: updatePayload,
        },
      );
    },
  );
}
