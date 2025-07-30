import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate error handling when deleting a non-existent or invalid external
 * account linkage for a customer.
 *
 * This test ensures that the API responds appropriately (with a not-found or
 * error response) when a request is made to delete an external account linkage
 * that either does not exist or does not belong to the specified customer.
 * Additionally, the test should verify that attempting such a deletion does not
 * impact the underlying customer record or other valid external account
 * linkages (if any).
 *
 * Step-by-step process:
 *
 * 1. Register a new customer with valid information (required for target customer
 *    context).
 * 2. Attempt to delete an externalAccountId that does not exist (use a valid UUID
 *    that was never registered as an external account for this customer).
 * 3. Confirm that a not-found error (or API-defined error) is returned.
 * 4. (Skipped due to missing API) Confirm that the customer's data remains
 *    unchanged.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_delete_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null,
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Attempt to delete a non-existent externalAccountId for this customer
  const nonExistentExternalAccountId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "Expect not-found when deleting non-existent external account",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.erase(
      connection,
      {
        customerId: customer.id,
        externalAccountId: nonExistentExternalAccountId,
      },
    );
  });

  // 3. (Skipped) Would re-fetch customer to validate no side effects, but no 'get by id' API present.
}
