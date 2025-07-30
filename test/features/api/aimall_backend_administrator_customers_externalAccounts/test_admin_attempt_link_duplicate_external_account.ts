import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate that admin cannot link an external account that is already linked to
 * another customer (conflict case).
 *
 * This test ensures the system enforces uniqueness for (provider,
 * external_user_id) regardless of who performs the linking operation, including
 * administrators.
 *
 * Workflow:
 *
 * 1. Register an administrator (for authorization).
 * 2. Create the first customer
 * 3. Link an external account (provider, external_user_id) to the first customer
 * 4. Create the second customer
 * 5. Try to link the same (provider, external_user_id) to the second customer
 *    (should fail with a uniqueness/conflict error).
 *
 * Steps:
 *
 * - Use random customer data for both customers.
 * - Use a fixed random provider and external_user_id for linking.
 * - Validate success for first linkage.
 * - Validate error thrown on second linkage, and that it is a uniqueness/conflict
 *   error (do not check error message; just assert error is thrown).
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_attempt_link_duplicate_external_account(
  connection: api.IConnection,
) {
  // 1. Register an administrator
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: typia.random<string>(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Register the first customer
  const customer1 = await api.functional.aimall_backend.customers.create(
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
  typia.assert(customer1);

  // 3. Link an external account to the first customer
  const provider = "google";
  const external_user_id = typia.random<string>();
  const externalAccount1 =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer1.id,
        body: {
          provider,
          external_user_id,
        },
      },
    );
  typia.assert(externalAccount1);

  // 4. Register a second customer
  const customer2 = await api.functional.aimall_backend.customers.create(
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
  typia.assert(customer2);

  // 5. Attempt to link the same (provider, external_user_id) to the second customer
  await TestValidator.error("duplicate external account linkage fails")(
    async () =>
      api.functional.aimall_backend.administrator.customers.externalAccounts.create(
        connection,
        {
          customerId: customer2.id,
          body: {
            provider,
            external_user_id,
          },
        },
      ),
  );
}
