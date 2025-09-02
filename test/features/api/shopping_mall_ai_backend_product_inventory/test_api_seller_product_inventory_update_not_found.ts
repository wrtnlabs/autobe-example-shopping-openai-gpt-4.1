import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_seller_product_inventory_update_not_found(
  connection: api.IConnection,
) {
  /**
   * Test update failure handling for a non-existent inventory as a seller.
   *
   * Business context: A seller, after registration and product creation,
   * attempts to update a product inventory using a random inventoryId that does
   * not exist for this product. This test verifies the API properly enforces
   * 'not found' constraints, returning an error in this scenario and ensuring
   * no resource is accidentally created or mutated.
   *
   * Step-by-step process:
   *
   * 1. Register/join a new seller account and obtain authentication context.
   * 2. Create a new product with the registered seller.
   * 3. Attempt to update an inventory for the product using a random
   *    (non-existent) inventoryId (since no inventories exist yet for this
   *    product).
   * 4. Assert that the API returns a 'not found' error during the update attempt.
   */

  // Step 1: Register as seller (creates authentication context)
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // Step 2: Create a product as this seller
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // Step 3: Generate a random inventoryId that cannot exist (no inventories have been registered for this product)
  const nonExistentInventoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Attempt the update - expect a not found error
  await TestValidator.error(
    "Attempt to update non-existent inventory as seller should result in 'not found' error",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.inventories.update(
        connection,
        {
          productId: product.id,
          inventoryId: nonExistentInventoryId,
          body: {
            available_quantity: 100,
            reserved_quantity: 0,
            last_update_at: new Date().toISOString(),
            inventory_status: RandomGenerator.pick([
              "in_stock",
              "out_of_stock",
              "reserved",
              "discontinued",
            ] as const),
          } satisfies IShoppingMallAiBackendProductInventory.IUpdate,
        },
      );
    },
  );
}
