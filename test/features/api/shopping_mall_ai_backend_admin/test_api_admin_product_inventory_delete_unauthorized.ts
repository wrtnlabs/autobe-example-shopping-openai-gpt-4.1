import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_product_inventory_delete_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Verify that unauthorized (non-admin) requests cannot delete product
   * inventory records.
   *
   * Test Workflow:
   *
   * 1. Register an admin account using /auth/admin/join so a valid admin exists
   *    (but DO NOT use the admin token).
   * 2. Create an unauthenticated API connection (empty headers) to simulate an
   *    anonymous request.
   * 3. Attempt to delete a product inventory using random UUIDs as identifiers.
   * 4. Assert that the call fails due to lack of authentication/authorization.
   *
   * This scenario validates that the API enforces authentication for inventory
   * deletion—regardless of resource existence, unauthorized access must be
   * rejected. No side-effect or resource cleanup is required. The test is
   * focused solely on the access control (forbidden/unauthorized) response.
   */

  // Step 1: Register an admin account (dependency fulfillment).
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  // DO NOT use or retain access token—we want an unauthenticated state below.

  // Step 2: Create a connection without any Authorization token.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt to delete product inventory. Use random UUIDs (resource existence does not matter).
  // Step 4: Assert that API refuses deletion due to lack of authentication/authorization.
  await TestValidator.error(
    "unauthorized inventory deletion must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.inventories.erase(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          inventoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
