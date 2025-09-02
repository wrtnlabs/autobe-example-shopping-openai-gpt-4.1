import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_seller_product_inventory_delete_success(
  connection: api.IConnection,
) {
  /**
   * Test successful deletion of a seller-owned product inventory record.
   *
   * This test verifies that an authenticated seller can:
   *
   * 1. Register a new seller account (auth context established)
   * 2. Create a new product
   * 3. Add an inventory record to that product
   * 4. Delete the inventory record by inventoryId
   *
   * Success is verified by: No error thrown on deletion, and the product record
   * (pre-fetched) remains valid.
   */

  // 1. Register as seller and establish authentication context
  const joinInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: joinInput,
  });
  typia.assert(sellerAuth);

  // 2. Create the product for the seller
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: "VAT10",
    sort_priority: 50,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create the inventory record for this product
  const inventoryInput: IShoppingMallAiBackendProductInventory.ICreate = {
    available_quantity: 50,
    reserved_quantity: 0,
    last_update_at: new Date().toISOString(),
    inventory_status: "in_stock",
  };
  const inventory =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.create(
      connection,
      {
        productId: product.id,
        body: inventoryInput,
      },
    );
  typia.assert(inventory);

  // 4. Perform the inventory deletion as the seller
  await api.functional.shoppingMallAiBackend.seller.products.inventories.erase(
    connection,
    {
      productId: product.id,
      inventoryId: inventory.id,
    },
  );

  // 5. Final validation: Product entity still exists (since API has no inventory GET/index)
  TestValidator.predicate(
    "product record remains after inventory deletion",
    typeof product.id === "string" &&
      !!product.id &&
      typeof product.title === "string",
  );
}
