import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";
import type { IPageIShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_customer_session_access_control_denied_for_non_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test to check access control enforcement for the admin customer session
   * listing endpoint.
   *
   * Scenario steps:
   *
   * 1. Join as a new customer and obtain authentication.
   * 2. (Prerequisite for later tests) Join as a new admin as well, but do not
   *    perform admin login for this negative customer test.
   * 3. Attempt to invoke
   *    api.functional.shoppingMallAiBackend.admin.customers.sessions.index
   *    using the customer access token.
   * 4. Validate that an access denied (authorization error) occurs—i.e., customers
   *    should not be able to list session data via the admin endpoint.
   * 5. Confirm proper HTTP error, but do not check error message contents.
   *
   * This test ensures privilege boundaries are strictly enforced between
   * customer and admin APIs.
   */

  // 1. Customer registration (obtain customer credentials)
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = typia.assert(customerJoin.customer.id);

  // 2. Also register an admin (required by environment but DO NOT login as admin here)
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(24),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // 3. Attempt to access admin sessions index as customer (must fail)
  await TestValidator.error(
    "customer cannot access admin customer sessions endpoint",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.sessions.index(
        connection,
        {
          customerId: customerId,
          body: {},
        },
      );
    },
  );
}
