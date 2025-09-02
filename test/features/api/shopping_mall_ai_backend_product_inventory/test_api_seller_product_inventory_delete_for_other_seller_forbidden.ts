import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

/**
 * Test that a seller cannot delete an inventory record for a product they
 * do not own.
 *
 * Validates sell-side authorization boundaries. Seller A creates a product
 * and inventory, then another seller (B) attempts to delete seller A's
 * inventory. Must receive forbidden/unauthorized error and inventory must
 * remain.
 *
 * Steps:
 *
 * 1. Register seller A (unique business credentials).
 * 2. Seller A creates a product.
 * 3. Seller A adds an inventory record for the product.
 * 4. Register seller B (unique business credentials), switching authentication
 *    context.
 * 5. Seller B attempts to delete seller A's product inventory record.
 * 6. Assert API returns forbidden/unauthorized error for seller B.
 */
export async function test_api_seller_product_inventory_delete_for_other_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerARegistrationNumber = RandomGenerator.alphaNumeric(12);
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      business_registration_number: sellerARegistrationNumber,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerA);

  // 2. Seller A creates a Product
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick(["draft", "active"] as const),
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 0,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Seller A adds Inventory
  const inventoryInput = {
    available_quantity: 10,
    reserved_quantity: 0,
    last_update_at: new Date().toISOString(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "out_of_stock",
      "reserved",
    ] as const),
  } satisfies IShoppingMallAiBackendProductInventory.ICreate;
  const inventory =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.create(
      connection,
      {
        productId: product.id,
        body: inventoryInput,
      },
    );
  typia.assert(inventory);
  const { id: inventoryId } = inventory;
  const { id: productId } = product;

  // 4. Register Seller B (new seller)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBRegistrationNumber = RandomGenerator.alphaNumeric(12);
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      business_registration_number: sellerBRegistrationNumber,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerB);

  // 5. Seller B attempts to delete Seller A's inventory
  await TestValidator.error(
    "seller B cannot delete another seller's inventory record",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.inventories.erase(
        connection,
        {
          productId,
          inventoryId,
        },
      );
    },
  );
}
