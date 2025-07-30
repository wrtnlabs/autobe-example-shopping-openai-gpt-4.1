import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate successful hard-delete of a customer account by admin.
 *
 * This test ensures an administrator can permanently delete a customer account
 * from the system. The workflow includes:
 *
 * 1. Registering a new customer account (precondition).
 * 2. Deleting the customer account using their unique customerId via the admin
 *    API.
 * 3. Confirming that the customer can no longer be found (by attempting to delete
 *    again and expecting an error).
 *
 * Steps:
 *
 * 1. Register a new customer using the backend API.
 * 2. Delete the customer as an administrator with the correct customerId.
 * 3. Assert that subsequent deletion attempts with the same customerId result in
 *    an error (404/not found).
 */
export async function test_api_aimall_backend_administrator_customers_test_delete_customer_account_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new customer for deletion test
  const newCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(24), // simulate a secure password hash
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(newCustomer);

  // 2. Delete the customer as administrator
  await api.functional.aimall_backend.administrator.customers.erase(
    connection,
    {
      customerId: newCustomer.id,
    },
  );

  // 3. Attempt to delete again; expect error (404 Not Found or similar)
  await TestValidator.error(
    "Deleting already-deleted customer should result in error",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.erase(
      connection,
      {
        customerId: newCustomer.id,
      },
    );
  });
}
