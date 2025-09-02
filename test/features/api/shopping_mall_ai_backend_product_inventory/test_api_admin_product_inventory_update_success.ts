import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_admin_product_inventory_update_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful update of a product inventory record by an admin.
   *
   * Test workflow:
   *
   * 1. Register a new admin account (establish admin authentication context)
   * 2. Create a product as the admin (ensure valid unique slug and business
   *    fields)
   * 3. Create an inventory record for the product as the admin
   * 4. Update the inventory record (change available_quantity, reserved_quantity,
   *    status and last update timestamp)
   * 5. Verify all changes correctly reflected in the returned inventory and that
   *    no extraneous changes occurred.
   */

  // 1. Register a new admin (establish authentication)
  const adminCreateInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(10),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hash
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreateInput,
  });
  typia.assert(adminAuth);

  // 2. Create a product as admin
  const productCreateInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 12,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "subscription",
      "bundle",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
      "discontinued",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 50,
    tax_code: `VAT${RandomGenerator.alphaNumeric(4)}`,
    sort_priority: 100,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productCreateInput },
    );
  typia.assert(product);

  // 3. Create a product inventory as admin
  const inventoryCreateInput: IShoppingMallAiBackendProductInventory.ICreate = {
    available_quantity: 30 as number & tags.Type<"int32">,
    reserved_quantity: 5 as number & tags.Type<"int32">,
    last_update_at: new Date().toISOString(),
    inventory_status: "in_stock",
  };
  const inventory =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.create(
      connection,
      {
        productId: product.id,
        body: inventoryCreateInput,
      },
    );
  typia.assert(inventory);

  // 4. Update the inventory record for this product
  const updateInput: IShoppingMallAiBackendProductInventory.IUpdate = {
    available_quantity: (inventory.available_quantity + 17) as number &
      tags.Type<"int32">,
    reserved_quantity: (inventory.reserved_quantity + 3) as number &
      tags.Type<"int32">,
    inventory_status: RandomGenerator.pick([
      "reserved",
      "out_of_stock",
      "in_stock",
      "discontinued",
    ] as const),
    last_update_at: new Date(Date.now() + 10000).toISOString(), // forward timestamp
  };
  const updatedInventory =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.update(
      connection,
      {
        productId: product.id,
        inventoryId: inventory.id,
        body: updateInput,
      },
    );
  typia.assert(updatedInventory);

  // 5. Validate all update changes are present
  TestValidator.equals(
    "inventory available_quantity updated",
    updatedInventory.available_quantity,
    updateInput.available_quantity,
  );
  TestValidator.equals(
    "inventory reserved_quantity updated",
    updatedInventory.reserved_quantity,
    updateInput.reserved_quantity,
  );
  TestValidator.equals(
    "inventory status updated",
    updatedInventory.inventory_status,
    updateInput.inventory_status,
  );
  TestValidator.equals(
    "inventory last_update_at updated",
    updatedInventory.last_update_at,
    updateInput.last_update_at,
  );
  TestValidator.equals(
    "inventory product ID remains correct",
    updatedInventory.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "inventory ID remains correct",
    updatedInventory.id,
    inventory.id,
  );
}
