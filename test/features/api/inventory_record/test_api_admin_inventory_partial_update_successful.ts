import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Simulate admin partial inventory update - tests authorization, partial field
 * update, and field immutability for SKU inventory.
 *
 * 1. Register new admin
 * 2. Create a category
 * 3. Create a product (with admin's id as seller)
 * 4. Create a SKU for the product
 * 5. Partially update inventory (change quantity_available and status only)
 * 6. Ensure only modified fields are changed, unmodified fields are unchanged
 * 7. Patch with different field (update quantity_reserved only), verify changes
 */
export async function test_api_admin_inventory_partial_update_successful(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Abcd1234!@#",
        full_name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create SKU
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph(),
        price: 1000,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // 5. Partial update the inventory (PATCH): increase quantity_available and change status
  const partialUpdateBody = {
    quantity_available: 20,
    status: "blocked",
  } satisfies IShoppingMallInventoryRecord.IPartialUpdate;

  const prevInventory: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.admin.products.skus.inventory.updatePartial(
      connection,
      {
        productId: sku.shopping_mall_product_id,
        skuId: sku.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(prevInventory);
  TestValidator.equals(
    "quantity_available is updated",
    prevInventory.quantity_available,
    20,
  );
  TestValidator.equals("status is updated", prevInventory.status, "blocked");

  // 6. Patch with another partial update on reserved field only
  const partialUpdateReserved = {
    quantity_reserved: 3,
  } satisfies IShoppingMallInventoryRecord.IPartialUpdate;
  const updatedInventory: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.admin.products.skus.inventory.updatePartial(
      connection,
      {
        productId: sku.shopping_mall_product_id,
        skuId: sku.id,
        body: partialUpdateReserved,
      },
    );
  typia.assert(updatedInventory);
  TestValidator.equals(
    "reserved quantity updated",
    updatedInventory.quantity_reserved,
    3,
  );
  TestValidator.equals(
    "previously updated available remains",
    updatedInventory.quantity_available,
    prevInventory.quantity_available,
  );
  TestValidator.equals(
    "previously updated status remains",
    updatedInventory.status,
    prevInventory.status,
  );
}
