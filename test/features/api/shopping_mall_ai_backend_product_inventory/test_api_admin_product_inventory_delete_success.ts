import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_admin_product_inventory_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin deletes a product inventory record
   *
   * This test ensures that:
   *
   * - An admin can be registered and authenticated
   * - The admin can create a product
   * - The admin can create an inventory record for this product
   * - The admin can delete the inventory record
   * - After deletion, attempts to interact with the record should indicate it no
   *   longer exists (not implemented due to lack of a read or index API for
   *   inventories), so a repeat delete is used for negative path verification
   */

  // 1. Register a new admin (includes authentication context)
  const createAdminInput = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@admin.com`,
    phone_number: null,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: createAdminInput,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin is active",
    adminAuth.admin.is_active === true,
  );

  // 2. Create a product as admin
  const createProductInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 7,
      wordMin: 3,
      wordMax: 8,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "draft",
      "active",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: createProductInput },
    );
  typia.assert(product);
  TestValidator.equals(
    "product title matches input",
    product.title,
    createProductInput.title,
  );

  // 3. Create an inventory record for this product
  const createInventoryInput = {
    available_quantity: 100,
    reserved_quantity: 0,
    last_update_at: new Date().toISOString(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "out_of_stock",
      "reserved",
    ] as const),
  } satisfies IShoppingMallAiBackendProductInventory.ICreate;
  const inventory =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.create(
      connection,
      {
        productId: product.id,
        body: createInventoryInput,
      },
    );
  typia.assert(inventory);
  TestValidator.equals(
    "inventory belongs to product",
    inventory.shopping_mall_ai_backend_products_id,
    product.id,
  );

  // 4. Delete the inventory record as admin
  await api.functional.shoppingMallAiBackend.admin.products.inventories.erase(
    connection,
    {
      productId: product.id,
      inventoryId: inventory.id as string & tags.Format<"uuid">,
    },
  );

  // 5. Repeat delete to verify it no longer exists (negative path)
  await TestValidator.error(
    "deleting already deleted inventory should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.inventories.erase(
        connection,
        {
          productId: product.id,
          inventoryId: inventory.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
