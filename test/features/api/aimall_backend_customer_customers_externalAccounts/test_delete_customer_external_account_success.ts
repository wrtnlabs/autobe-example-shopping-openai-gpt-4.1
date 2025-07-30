import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Test successful unlinking (deletion) of a customer's external account.
 *
 * Validates that a customer can unlink (delete) one of their own external
 * (OAuth or federated) accounts via the API. The process includes registering a
 * customer, linking an external account for that customer, then deleting the
 * external account linkage, and confirming that the operation succeeds without
 * error.
 *
 * Steps:
 *
 * 1. Register a customer (aimall_backend.customers.create)
 * 2. Link an external account
 *    (aimall_backend.customer.customers.externalAccounts.create)
 * 3. Unlink (delete) the external account
 *    (aimall_backend.customer.customers.externalAccounts.erase)
 * 4. [Omitted] List/get external accounts (not available in the provided SDK)
 *
 * Since the SDK does not provide a listing endpoint for external accounts,
 * confirmation of deletion is limited to absence of thrown errors.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_delete_customer_external_account_success(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        status: "active",
        password_hash: "dummyhash123456789",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Link an external account for the customer
  const externalAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: typia.random<string>(),
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(externalAccount);

  // 3. Unlink (delete) the external account linkage
  await api.functional.aimall_backend.customer.customers.externalAccounts.erase(
    connection,
    {
      customerId: customer.id,
      externalAccountId: externalAccount.id,
    },
  );

  // 4. No verification by listing (API not provided in inputs), so the test confirms no error is thrown
}
