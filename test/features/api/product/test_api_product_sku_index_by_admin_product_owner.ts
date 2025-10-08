import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test that an authenticated admin can retrieve and filter SKUs for their
 * products.
 *
 * 1. Register and authenticate admin, ensuring 'status' and 'full_name' set.
 * 2. Create product category (fill out localization names, mark active).
 * 3. Create product in new category (assign to created admin, random attributes,
 *    active).
 * 4. Use PATCH /shoppingMall/admin/products/{productId}/skus to get all SKUs for
 *    the product.
 *
 * - Validate response is correct paginated container.
 * - For the created product (likely with 0 initial SKUs), expect empty data or
 *   default variants.
 * - Test retrieval with random filter (e.g., name, sku_code) -- expect empty or
 *   correct matching results.
 * - If possible, test pagination (page > 1 should return empty).
 *
 * 5. (Optional edge) Try a search for a non-existent SKU.
 */
export async function test_api_product_sku_index_by_admin_product_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        status: "active",
      },
    });
  typia.assert(admin);

  // 2. Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        display_order: 0,
        is_active: true,
      },
    });
  typia.assert(category);

  // 3. Create product in category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_active: true,
      },
    });
  typia.assert(product);

  // 4. Retrieve all SKUs (basic call, no filters)
  const allSkus: IPageIShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: {},
    });
  typia.assert(allSkus);
  // Validate all SKUs belong to correct product
  allSkus.data.forEach((sku) => {
    TestValidator.equals(
      "SKU belongs to product",
      sku.shopping_mall_product_id,
      product.id,
    );
  });
  // If no SKUs exist, expect data empty; else, expect correct relationship
  TestValidator.equals(
    "SKU list owns correct product or empty",
    allSkus.data.every((x) => x.shopping_mall_product_id === product.id),
    true,
  );

  // 5. Retrieve SKUs with filter: by name (should be exact match or empty data)
  if (allSkus.data.length > 0) {
    const randomSku = RandomGenerator.pick(allSkus.data);
    const byName: IPageIShoppingMallProductSku =
      await api.functional.shoppingMall.admin.products.skus.index(connection, {
        productId: product.id,
        body: { name: randomSku.name },
      });
    typia.assert(byName);
    // Match all returned data to queried name
    byName.data.forEach((sku) => {
      TestValidator.equals(
        "SKU filter by name matched",
        sku.name,
        randomSku.name,
      );
    });
  }

  // 6. Retrieve SKUs with nonexistent filter value (expect empty)
  const none: IPageIShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: { name: "nonexistent-sku-name-" + RandomGenerator.alphaNumeric(8) },
    });
  typia.assert(none);
  TestValidator.equals(
    "Nonexistent SKU filter returns empty",
    none.data.length,
    0,
  );

  // 7. Retrieve SKUs with pagination (page 2, expect empty or valid if many SKUs)
  const pageTwo: IPageIShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: { page: 2 as number & tags.Type<"int32"> & tags.Minimum<1> },
    });
  typia.assert(pageTwo);
  if (allSkus.pagination.pages < 2) {
    TestValidator.equals(
      "SKU page 2 should be empty when not enough SKUs",
      pageTwo.data.length,
      0,
    );
  }
}
