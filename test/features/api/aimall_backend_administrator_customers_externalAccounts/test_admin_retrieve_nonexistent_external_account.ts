import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validates not-found error on administrator retrieval of nonexistent or
 * unlinked external account.
 *
 * This test ensures that when an administrator attempts to fetch the details of
 * an external account using a specific customerId/externalAccountId pair where
 * no such linkage exists, the system returns an appropriate error (e.g.,
 * not-found) with no data leakage about other external accounts or
 * cross-customer relationships.
 *
 * Steps:
 *
 * 1. Register a customer without linking any external accounts (via API backend).
 * 2. Generate a random UUID to represent an external account id that does not
 *    exist or is not associated with this customer.
 * 3. Use the admin endpoint to attempt retrieval of this nonexistent external
 *    account for the registered customer.
 * 4. Confirm an error is raised (TestValidator.error) and no external account data
 *    is returned.
 * 5. This confirms safe backend error handling and absence of data leakage to the
 *    administrator.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_retrieve_nonexistent_external_account(
  connection: api.IConnection,
) {
  // 1. Register a customer (no external accounts linked)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create a random UUID as the (nonexistent/unlinked) external account id
  const externalAccountId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Attempt retrieval via admin endpoint, expect error (not-found or similar), no data leakage
  await TestValidator.error(
    "404 expected for nonexistent/unlinked external account",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.externalAccounts.at(
      connection,
      {
        customerId: customer.id,
        externalAccountId,
      },
    );
  });
}
