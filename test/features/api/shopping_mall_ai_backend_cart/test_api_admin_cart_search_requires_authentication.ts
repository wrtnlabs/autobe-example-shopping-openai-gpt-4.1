import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that admin cart search requires authentication and
 * unauthenticated invocations are denied.
 *
 * Business context: For security, all cart search operations at the admin
 * endpoint must require a valid admin authentication context. This test
 * ensures the endpoint rejects unauthenticated requests, even when a valid
 * admin exists.
 *
 * Steps:
 *
 * 1. Register an admin via /auth/admin/join to set up system state
 * 2. Construct a new connection with empty headers (simulating no
 *    authentication)
 * 3. Attempt to call /shoppingMallAiBackend/admin/carts using this
 *    unauthenticated connection, and assert that an error is thrown (auth
 *    error)
 * 4. (Optional positive path) Call the same endpoint using authenticated
 *    connection to confirm baseline system behavior
 */
export async function test_api_admin_cart_search_requires_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register an admin (precondition: valid admin exists in the system)
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAiBackendAdmin.ICreate>(),
  });
  typia.assert(admin);

  // Step 2: Simulate unauthenticated access by removing auth headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt admin carts search with unauthenticated connection, expect error
  await TestValidator.error(
    "cart search without authentication is denied",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.carts.index(unauthConn, {
        body: typia.random<IShoppingMallAiBackendCart.IRequest>(),
      });
    },
  );

  // Step 4: (Optional) With authentication, carts search endpoint works
  const output = await api.functional.shoppingMallAiBackend.admin.carts.index(
    connection,
    {
      body: typia.random<IShoppingMallAiBackendCart.IRequest>(),
    },
  );
  typia.assert(output);
}
