import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_seller_create_inventory_success(
  connection: api.IConnection,
) {
  /**
   * Test that a seller can register a new inventory entry for a product they
   * own.
   *
   * Steps:
   *
   * 1. Register as a seller (acquire authorization context)
   * 2. Generate a productId to simulate a seller-owned product (since creation is
   *    outside scope)
   * 3. Construct a valid inventory creation payload
   * 4. Invoke the inventory creation API as the seller
   * 5. Verify: (a) inventory is linked to product, (b) response fields match
   *    request fields
   */

  // 1. Register & login as a seller (required for inventory creation)
  const sellerRegistration = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerRegistration);
  const seller = sellerRegistration.seller;

  // 2. Prepare a productId for inventory creation (simulate product ownership)
  //    (NOTE: In real test, supply actual product ID. Here, generate a UUID.)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Build inventory creation request with randomized but valid data
  const now = new Date();
  const inventoryPayload = {
    available_quantity: typia.random<number & tags.Type<"int32">>(),
    reserved_quantity: typia.random<number & tags.Type<"int32">>(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "out_of_stock",
      "reserved",
      "discontinued",
    ] as const),
    last_update_at: now.toISOString(),
  } satisfies IShoppingMallAiBackendProductInventory.ICreate;

  // 4. Create inventory for the product as the authenticated seller
  const inventory =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.create(
      connection,
      {
        productId,
        body: inventoryPayload,
      },
    );
  typia.assert(inventory);

  // 5. Validate that key fields match between input and output, and linkage is correct
  TestValidator.equals(
    "inventory links to correct product",
    inventory.shopping_mall_ai_backend_products_id,
    productId,
  );
  TestValidator.equals(
    "available_quantity matches",
    inventory.available_quantity,
    inventoryPayload.available_quantity,
  );
  TestValidator.equals(
    "reserved_quantity matches",
    inventory.reserved_quantity,
    inventoryPayload.reserved_quantity,
  );
  TestValidator.equals(
    "inventory_status matches",
    inventory.inventory_status,
    inventoryPayload.inventory_status,
  );
  TestValidator.equals(
    "last_update_at matches",
    inventory.last_update_at,
    inventoryPayload.last_update_at,
  );
}
