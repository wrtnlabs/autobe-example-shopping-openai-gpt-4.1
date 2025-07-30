import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate that an administrator can update a customer’s external account
 * linkage.
 *
 * Business context: Administrators may need to re-link, re-validate, or correct
 * external account linkage information for a customer (such as provider or
 * external_user_id). Only admins may perform this with privileged operations.
 * All updates should be checked for correct application and successful business
 * flow.
 *
 * Test process:
 *
 * 1. Create a customer account via the backend API.
 * 2. Create an admin account, simulating an authenticated privileged session.
 * 3. Link a new external (OAuth/federated) account for the created customer using
 *    the administrator endpoint.
 * 4. As admin, perform an update operation on the external account linkage
 *    (provider and external_user_id).
 * 5. Validate that the update succeeds, and that the fields on the external
 *    account have correctly changed.
 */
export async function test_api_administrator_test_admin_update_customer_external_account(
  connection: api.IConnection,
) {
  // 1. Create a customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create an admin account
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 3. Link a new external account for this customer (as admin)
  const createdExternalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: RandomGenerator.alphaNumeric(14),
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(createdExternalAccount);

  // 4. Update the external account linkage as admin
  const updatedProvider = "kakao";
  const updatedExternalUserId = RandomGenerator.alphaNumeric(18);
  const updatedExternalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: createdExternalAccount.id,
        body: {
          provider: updatedProvider,
          external_user_id: updatedExternalUserId,
        } satisfies IAIMallBackendExternalAccount.IUpdate,
      },
    );
  typia.assert(updatedExternalAccount);

  // 5. Validate that fields are updated
  TestValidator.equals("provider updated")(updatedExternalAccount.provider)(
    updatedProvider,
  );
  TestValidator.equals("external_user_id updated")(
    updatedExternalAccount.external_user_id,
  )(updatedExternalUserId);
  TestValidator.equals("customer_id unchanged")(
    updatedExternalAccount.customer_id,
  )(customer.id);
}
