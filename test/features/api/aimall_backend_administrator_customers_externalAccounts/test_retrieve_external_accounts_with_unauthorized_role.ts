import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate that users with insufficient privileges are denied access when
 * attempting to retrieve the list of external accounts linked to a customer,
 * via the admin endpoint.
 *
 * Business context: This endpoint exposes potentially sensitive external
 * linkage information (e.g., OAuth accounts) for a customer. Only
 * administrators or the customer themself may legitimately retrieve this info;
 * all other roles or unauthenticated requests must be denied, in line with
 * privacy and security policy.
 *
 * Steps:
 *
 * 1. Register a customer (test subject).
 * 2. Attempt to retrieve that customer's external accounts via the admin endpoint
 *    without authenticating as admin or customer — e.g., remain anonymous, or
 *    authenticate as unrelated role if available (here, act unauthenticated as
 *    concrete forbidden role is not specified).
 * 3. Expect a 403 Forbidden or corresponding authorization error, confirming
 *    access control enforcement.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_retrieve_external_accounts_with_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. Register a new customer (potential target)
  const newCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphabets(24),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(newCustomer);

  // 2. Attempt to retrieve external accounts as unauthorized/anonymous user
  //    Expectation: Access denied (HTTP 403 or similar error)
  await TestValidator.error(
    "unauthorized role cannot retrieve external accounts",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.externalAccounts.index(
      connection,
      {
        customerId: newCustomer.id,
      },
    );
  });
}
