import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import type { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_inventory_list_failure_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validate that unauthorized requests to the admin product inventory listing
   * endpoint are properly rejected.
   *
   * This test confirms security boundaries by:
   *
   * 1. Registering a legitimate admin account (so valid credentials exist in the
   *    system, to realistically mirror live conditions)
   * 2. Constructing a connection object WITHOUT any Authorization header
   *    (simulating an unauthenticated, anonymous client)
   * 3. Attempting to list inventories for a (random) product via the PATCH
   *    /shoppingMallAiBackend/admin/products/{productId}/inventories endpoint
   * 4. Asserting the API responds with an authorization error (such as 401 or
   *    403), without exposing inventory data
   *
   * This ensures that without explicit credentials, privileged operations for
   * product inventory listing are strictly denied, enforcing proper
   * authentication discipline.
   */

  // 1. Register an admin account to ensure a valid admin exists in the system
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@mall-admin.com`,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);

  // 2. Prepare an unauthenticated (no Authorization header) connection object
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 3. Compose inventory listing request for a random product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRequest: IShoppingMallAiBackendProductInventory.IRequest =
    typia.random<IShoppingMallAiBackendProductInventory.IRequest>();

  // 4. Attempt unauthorized listing (expecting authentication/authorization error)
  await TestValidator.error(
    "unauthenticated admin inventory list should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.inventories.index(
        unauthConnection,
        {
          productId,
          body: inventoryRequest,
        },
      );
    },
  );
}
