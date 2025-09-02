import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_seller_product_inventory_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validate that a seller can retrieve the details of a specific product
   * inventory by inventoryId and productId.
   *
   * Business flow:
   *
   * 1. Seller registers/login.
   * 2. ProductId is generated for use since product creation API is absent.
   * 3. Seller creates an inventory record for the product.
   * 4. Seller fetches the inventory details by productId and inventoryId.
   * 5. All major inventory fields are validated for consistency.
   * 6. Access control negative scenario: retrieval using unrelated
   *    product/inventory IDs should fail.
   */

  // 1. Register seller and login (authentication context)
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Generate productId for reference (since product creation is not provided)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create inventory record for the generated productId
  const inventoryCreateInput: IShoppingMallAiBackendProductInventory.ICreate = {
    available_quantity: typia.random<number & tags.Type<"int32">>(),
    reserved_quantity: typia.random<number & tags.Type<"int32">>(),
    last_update_at: new Date().toISOString(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "out_of_stock",
      "reserved",
      "discontinued",
    ] as const),
  };
  const createdInventory =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.create(
      connection,
      {
        productId,
        body: inventoryCreateInput,
      },
    );
  typia.assert(createdInventory);

  // 4. Fetch inventory detail by productId and inventoryId
  const retrieved =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.at(
      connection,
      {
        productId,
        inventoryId: createdInventory.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(retrieved);

  // 5. Validate all major fields for consistency
  TestValidator.equals(
    "productId matches",
    retrieved.shopping_mall_ai_backend_products_id,
    productId,
  );
  TestValidator.equals(
    "available_quantity matches",
    retrieved.available_quantity,
    inventoryCreateInput.available_quantity,
  );
  TestValidator.equals(
    "reserved_quantity matches",
    retrieved.reserved_quantity,
    inventoryCreateInput.reserved_quantity,
  );
  TestValidator.equals(
    "inventory_status matches",
    retrieved.inventory_status,
    inventoryCreateInput.inventory_status,
  );
  TestValidator.equals(
    "last_update_at matches",
    retrieved.last_update_at,
    inventoryCreateInput.last_update_at,
  );

  // 6. Negative case: fetching inventory with unrelated product/inventory IDs
  await TestValidator.error(
    "cannot retrieve unrelated inventory details",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.inventories.at(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          inventoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
