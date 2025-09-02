import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

/**
 * Verify that unauthenticated users cannot update product inventory via the
 * admin API.
 *
 * This test simulates an unauthenticated request to the PUT
 * /shoppingMallAiBackend/admin/products/{productId}/inventories/{inventoryId}
 * endpoint in order to update an inventory record. The connection object is
 * constructed without an Authorization header to emulate an unauthorized
 * (not-logged-in) user. The API call is supplied with random productId,
 * inventoryId, and update body values. The test expects the API to return
 * an unauthorized error (typically HTTP 401), confirming that
 * authentication is strictly required for admin inventory updates. The test
 * does not attempt to verify inventory state after the call since
 * product/inventory cannot be reliably created without admin setup and no
 * side effect should occur on error. A successful run is when the
 * unauthorized update is rejected as expected.
 */
export async function test_api_admin_product_inventory_update_unauthorized(
  connection: api.IConnection,
) {
  // Prepare random valid-looking IDs for product and inventory
  const productId = typia.random<string & tags.Format<"uuid">>();
  const inventoryId = typia.random<string & tags.Format<"uuid">>();
  // Prepare a random inventory update payload (all fields optional per DTO)
  const updateData =
    typia.random<IShoppingMallAiBackendProductInventory.IUpdate>();

  // Create a connection object with no Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to update inventory and expect an unauthorized error (HTTP 401)
  await TestValidator.error(
    "inventory update requires authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.inventories.update(
        unauthenticatedConnection,
        {
          productId,
          inventoryId,
          body: updateData,
        },
      );
    },
  );
}
