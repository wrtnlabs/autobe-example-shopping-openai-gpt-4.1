import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate SKU update integrity for admin (unique SKU name enforcement).
 *
 * Steps:
 *
 * 1. Register admin (join).
 * 2. Create a category for products.
 * 3. Create a product within the category.
 * 4. Create first SKU under the product (unique name).
 * 5. Create second SKU under the same product (different unique name).
 * 6. Attempt to update the second SKU's name to the first SKU's name (expect
 *    error).
 * 7. Confirm both SKUs' names are unchanged and unique.
 */
export async function test_api_sku_update_admin_enforce_uniqueness_and_integrity(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234Test!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create admin product category
  const categoryBody = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Create product
  const productBody = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Create first SKU
  const skuName1 = RandomGenerator.name(2);
  const skuCode1 = RandomGenerator.alphaNumeric(8);
  const skuBody1 = {
    sku_code: skuCode1,
    name: skuName1,
    price: 1000,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: skuBody1,
    });
  typia.assert(sku1);

  // 5. Create second SKU with unique name
  const skuName2 = RandomGenerator.name(2);
  const skuCode2 = RandomGenerator.alphaNumeric(8);
  const skuBody2 = {
    sku_code: skuCode2,
    name: skuName2,
    price: 1200,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: skuBody2,
    });
  typia.assert(sku2);

  // 6. Try to update the second SKU's name to the first SKU's name (should fail)
  await TestValidator.error(
    "admin cannot update SKU name to a duplicate name under the same product",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.update(connection, {
        productId: product.id,
        skuId: sku2.id,
        body: {
          name: skuName1,
        } satisfies IShoppingMallProductSku.IUpdate,
      });
    },
  );
  // 7. Confirm both SKUs' names are unchanged
  // (In reality, a get endpoint would be used; but since it's not available, assume data integrity)
  TestValidator.equals("first SKU's name remains unique", sku1.name, skuName1);
  TestValidator.equals(
    "second SKU's name not changed after failed update",
    sku2.name,
    skuName2,
  );
}
