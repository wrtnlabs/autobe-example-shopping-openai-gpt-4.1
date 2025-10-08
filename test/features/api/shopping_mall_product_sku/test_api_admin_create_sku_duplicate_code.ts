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
 * Validates business enforcement of SKU code uniqueness when an admin attempts
 * to create duplicate SKUs for the same product.
 *
 * 1. Register and authenticate as an admin.
 * 2. Admin creates a category needed for product association.
 * 3. Admin registers a product under that category for SKU creation.
 * 4. Admin creates the first SKU for the product with a new unique sku_code
 *    (should succeed).
 * 5. Admin attempts to create a second SKU with the exact same sku_code under the
 *    same product (should fail with business validation error).
 * 6. Assert that business logic rejects the duplicate code scenario.
 */
export async function test_api_admin_create_sku_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 6,
        }),
        name_en: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 6,
        }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Admin creates a product under the category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 6,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 16,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create first SKU with unique code
  const sku_code = RandomGenerator.alphaNumeric(8);
  const createSkuBody = {
    sku_code,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 6 }),
    price: 1099.99,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const firstSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: createSkuBody,
    });
  typia.assert(firstSku);
  TestValidator.equals(
    "SKU code should be set correctly",
    firstSku.sku_code,
    sku_code,
  );

  // 5. Attempt to create a second SKU with the same code (should fail)
  await TestValidator.error(
    "Should reject duplicate SKU code in the same product",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.create(connection, {
        productId: product.id,
        body: createSkuBody,
      });
    },
  );
}
