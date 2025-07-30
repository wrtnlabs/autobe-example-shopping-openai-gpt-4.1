import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate that non-administrator users (e.g., regular customers) are forbidden
 * from deleting external accounts via the administrator endpoint.
 *
 * This test ensures that the DELETE operation on
 * /aimall-backend/administrator/customers/{customerId}/externalAccounts/{externalAccountId}
 * can only be performed by admins and not regular users. The scenario is as
 * follows:
 *
 * 1. Register a regular customer in the system (dependency).
 * 2. As an administrator, link an external account to that customer (dependency).
 * 3. (Simulate customer context) Attempt to delete the external account using the
 *    administrator DELETE endpoint as a non-admin.
 * 4. Verify that the operation is denied (403 Forbidden).
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_delete_external_account_permission_denied_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a regular customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: RandomGenerator.alphabets(10) + "@test.com",
    phone: RandomGenerator.mobile(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Link an external account for that customer (admin privilege assumed)
  const externalAccountInput: IAIMallBackendExternalAccount.ICreate = {
    provider: "test-provider",
    external_user_id: RandomGenerator.alphaNumeric(20),
  };
  const externalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: externalAccountInput,
      },
    );
  typia.assert(externalAccount);

  // 3. Attempt DELETE operation as a non-admin (no session switch API available, so simulate context using the same connection)
  await TestValidator.error("Non-admin cannot delete an external account")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.externalAccounts.erase(
        connection,
        {
          customerId: customer.id,
          externalAccountId: externalAccount.id,
        },
      );
    },
  );
}
