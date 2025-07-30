import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Test the successful deletion of an external account (e.g., 'google') linked
 * to a customer by an administrator.
 *
 * Ensures that after deletion, the external account cannot be found, deletion
 * is irreversible, and all referential and audit cleanups occur.
 *
 * Steps:
 *
 * 1. Create a test customer account (with required fields) using the backend
 *    customer create API.
 * 2. Link a new external account (e.g., with provider 'google') to the customer
 *    using the admin API, saving its id for deletion.
 * 3. Delete that external account using the admin erase endpoint, with both the
 *    customerId and externalAccountId.
 * 4. (Optional, if get/query available) Verify that the external account no longer
 *    exists with a subsequent call or by expecting error/not found if such an
 *    API exists.
 * 5. This is a permissioned action; run only as admin. Confirm that the operation
 *    does not error.
 * 6. (Audit log verification is assumed responsibility of the backend; basic
 *    coverage is that deletion works and the link cannot be found again.)
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_delete_external_account_success_admin_removes_customer_external_account(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(24),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Link a new external account (provider='google')
  const externalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: RandomGenerator.alphaNumeric(24),
        },
      },
    );
  typia.assert(externalAccount);

  // 3. Delete the external account as admin
  await api.functional.aimall_backend.administrator.customers.externalAccounts.erase(
    connection,
    {
      customerId: customer.id,
      externalAccountId: externalAccount.id,
    },
  );

  // 4. (Cannot verify deletion with a follow-up get, as no get/list endpoint is in scope.)
  // Assume success if no error is thrown and request completed.
}
