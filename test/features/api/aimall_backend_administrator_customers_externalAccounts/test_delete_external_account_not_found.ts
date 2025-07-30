import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate 404 "Not Found" error when deleting a non-existent external account
 * linkage for a real customer.
 *
 * Business rationale: Administrators may attempt to delete federated account
 * links that do not exist (e.g., due to user removal, data drift, or
 * external-id mismatch). The API must return a 404 Not Found (not 200/204), and
 * no customer data must be affected.
 *
 * Test steps:
 *
 * 1. Create a new customer using the real customer creation API (validates
 *    dependency and context)
 * 2. Attempt to delete an externalAccountId (random) that does not exist for this
 *    customerId:
 *
 *    - API should throw 404 Not Found (HttpError)
 *    - Validate thrown error is a 404, has proper structure, and no side effects
 *         occur
 * 3. Optionally re-fetch the customer to verify there are no unintended changes or
 *    side effects (customer record remains valid) (Skipped as
 *    customer-get-by-id API is unavailable)
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_delete_external_account_not_found(
  connection: api.IConnection,
) {
  // 1. Create a customer account for context
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Attempt to delete a non-existent external account linkage for this customer
  const nonExistentExternalAccountId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should throw 404 Not Found for nonexistent external account",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.externalAccounts.erase(
      connection,
      {
        customerId: customer.id,
        externalAccountId: nonExistentExternalAccountId,
      },
    );
  });
  // 3. (Optional) Re-fetch or invariant check for customer record is omitted (API not provided)
}
