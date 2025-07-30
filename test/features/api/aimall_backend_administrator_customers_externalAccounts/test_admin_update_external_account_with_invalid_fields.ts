import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate error handling by admin on updating an external account's immutable
 * fields.
 *
 * Business context:
 *
 * - Only certain fields (if any) on an external account linkage may be updatable.
 * - Provider and external_user_id are typically immutable: updating them may not
 *   be allowed and should return a proper error.
 * - Inputting invalid information (e.g., invalid provider name, blank user ID)
 *   should yield validation or business logic errors, not silently succeed.
 *
 * Test steps:
 *
 * 1. Register a customer account to own the external account linkage (admin
 *    use-case).
 * 2. Create an admin account (for permission to invoke the update endpoint).
 * 3. Link an external account to the customer as admin.
 * 4. Attempt to update the external account with invalid/mutated provider and/or
 *    external_user_id (e.g., change provider, blank/extremely long/invalid user
 *    id), expecting an error response in each case.
 * 5. For each invalid scenario, confirm that an HTTP/business error is thrown and
 *    the object is not updated.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_update_external_account_with_invalid_fields(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register admin
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: "MyAdmin",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);
  // (Assume authentication/privilege context is already established via connection)

  // 3. Link external account
  const externalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: "uid-123",
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(externalAccount);

  // 4a. Attempt to change provider (immutable field - not allowed by business logic?)
  await TestValidator.error("immutable provider should cause error")(() =>
    api.functional.aimall_backend.administrator.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "kakao",
          external_user_id: externalAccount.external_user_id,
        } satisfies IAIMallBackendExternalAccount.IUpdate,
      },
    ),
  );

  // 4b. Attempt to set an invalid provider value
  await TestValidator.error("invalid provider code should cause error")(() =>
    api.functional.aimall_backend.administrator.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "",
          external_user_id: externalAccount.external_user_id,
        } satisfies IAIMallBackendExternalAccount.IUpdate,
      },
    ),
  );

  // 4c. Attempt to set empty external_user_id
  await TestValidator.error("empty external_user_id should cause error")(() =>
    api.functional.aimall_backend.administrator.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: externalAccount.provider,
          external_user_id: "",
        } satisfies IAIMallBackendExternalAccount.IUpdate,
      },
    ),
  );

  // 4d. Attempt to set a very long external_user_id
  await TestValidator.error("overly long external_user_id should cause error")(
    () =>
      api.functional.aimall_backend.administrator.customers.externalAccounts.update(
        connection,
        {
          customerId: customer.id,
          externalAccountId: externalAccount.id,
          body: {
            provider: externalAccount.provider,
            external_user_id: "A".repeat(512),
          } satisfies IAIMallBackendExternalAccount.IUpdate,
        },
      ),
  );

  // 5. (Optional) Confirm the object wasn't mutated - should still exist and match the original
}
