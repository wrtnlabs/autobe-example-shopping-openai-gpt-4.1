import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import type { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_inventory_list_failure_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validates rejection of inventory list requests by unauthorized sellers.
   *
   * This test confirms that a PATCH request to
   * /shoppingMallAiBackend/seller/products/{productId}/inventories without
   * authentication results in an authorization error, enforcing proper seller
   * role protection.
   *
   * Steps:
   *
   * 1. Register a new seller (dependency for setup consistency, but not used for
   *    this unauthorized request)
   * 2. Create an unauthorized connection object (empty headers)
   * 3. Attempt to list product inventories using PATCH with this unauthorized
   *    connection
   * 4. Assert the call fails—i.e., the API rejects the request due to missing
   *    authentication
   */
  // 1. Register a new seller (dependency setup)
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Prepare an unauthorized connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt PATCH for inventory listing with unauthorized connection
  await TestValidator.error(
    "unauthorized seller cannot list inventories",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.inventories.index(
        unauthConn,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IShoppingMallAiBackendProductInventory.IRequest,
        },
      );
    },
  );
}
