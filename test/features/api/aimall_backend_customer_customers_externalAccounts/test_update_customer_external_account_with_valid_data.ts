import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate updating an external account linked to a customer.
 *
 * Ensures that a customer can update their own external account linkage
 * information (specifically, the allowed updatable fields like provider or
 * external_user_id). This simulates a full workflow: create a new customer,
 * link an external account for them, perform a valid update to the linkage, and
 * verify that the changes are persisted in the API response.
 *
 * Steps:
 *
 * 1. Create a customer with required data
 * 2. Link a new external account to that customer
 * 3. Update the external account linkage fields (provider and external_user_id)
 * 4. Validate that the update is reflected in the updated external account entity
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_update_customer_external_account_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new customer
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

  // 3. Update the external account (change provider and external_user_id)
  const updatedProvider = "kakao";
  const updatedExternalUserId = typia.random<string>();
  const updated =
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: updatedProvider,
          external_user_id: updatedExternalUserId,
        } satisfies IAIMallBackendExternalAccount.IUpdate,
      },
    );
  typia.assert(updated);

  // 4. Validate that updates are persisted
  TestValidator.equals("provider updated")(updated.provider)(updatedProvider);
  TestValidator.equals("external_user_id updated")(updated.external_user_id)(
    updatedExternalUserId,
  );
}
