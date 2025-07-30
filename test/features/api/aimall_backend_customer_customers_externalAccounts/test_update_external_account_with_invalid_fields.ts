import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate failure of updating immutable or invalid external account fields
 *
 * This test verifies that the system prevents improper updates to external
 * account linkages, specifically for fields that are expected to be immutable
 * (such as provider or external_user_id) or when invalid values are supplied.
 * The expected result for all cases is that the API returns an error (typically
 * validation or business logic error), and the data is not changed.
 *
 * Workflow:
 *
 * 1. Register a new customer (so a valid customerId exists).
 * 2. Link a new external account (so a valid externalAccountId exists for that
 *    customer).
 * 3. Attempt to update the external account with invalid/illegal changes:
 *
 *    - Try to change provider field to a new (different) value (should be immutable
 *         according to business logic).
 *    - Try to change external_user_id to a different value (should be immutable if
 *         business logic enforces such rule).
 *    - Try to set blank or invalid values on fields (e.g., empty provider, empty
 *         external_user_id).
 *    - (add other invalid value cases as relevant to DTO/validation)
 * 4. For each case, assert that an error is returned from the update call.
 *
 *    - Optionally, re-fetch the external account and verify data is unchanged (if a
 *         'get' endpoint is available—otherwise skip this step).
 *
 * Edge cases:
 *
 * - Both fields changed simultaneously
 * - Excessively long or obviously invalid strings assigned to fields
 * - Null values supplied (if allowed/should be rejected)
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_update_external_account_with_invalid_fields(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Link new external account
  const externalAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: "oauth-test-user-1",
        },
      },
    );
  typia.assert(externalAccount);

  // 3a. Attempt to update provider to a different value (should fail)
  await TestValidator.error("provider field immutable")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "kakao",
          external_user_id: externalAccount.external_user_id,
        },
      },
    );
  });

  // 3b. Attempt to update external_user_id to a different value (should fail)
  await TestValidator.error("external_user_id field immutable")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: externalAccount.provider,
          external_user_id: "changed-oauth-user-2",
        },
      },
    );
  });

  // 3c. Attempt to set blank provider
  await TestValidator.error("blank provider invalid")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "",
          external_user_id: externalAccount.external_user_id,
        },
      },
    );
  });

  // 3d. Attempt to set blank external_user_id
  await TestValidator.error("blank external_user_id invalid")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: externalAccount.provider,
          external_user_id: "",
        },
      },
    );
  });

  // 3e. Attempt to set both fields to invalid (both change & empty)
  await TestValidator.error("both fields changed/invalid")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "",
          external_user_id: "",
        },
      },
    );
  });

  // 3f. Attempt excessively long strings
  await TestValidator.error("provider too long")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "x".repeat(1024),
          external_user_id: externalAccount.external_user_id,
        },
      },
    );
  });
  await TestValidator.error("external_user_id too long")(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: customer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: externalAccount.provider,
          external_user_id: "y".repeat(1024),
        },
      },
    );
  });
}
