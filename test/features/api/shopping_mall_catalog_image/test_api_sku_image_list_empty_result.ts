import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Attempt to list SKU images for a new SKU with no images uploaded and expect
 * an empty result.
 *
 * Steps:
 *
 * 1. Create an admin and join
 * 2. Create a category as admin
 * 3. Register a seller
 * 4. Seller creates a product in the test category
 * 5. Seller creates a SKU for the product (with no images attached)
 * 6. Call SKU image list endpoint with default (empty) body
 * 7. Call SKU image list endpoint with productId/skuId filter in body
 * 8. For both responses, check:
 *
 *    - Data is []
 *    - Pagination structure is present and has sensible default values (page 0,
 *         limit >0, etc)
 */
export async function test_api_sku_image_list_empty_result(
  connection: api.IConnection,
) {
  // 1. Register admin and join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Admin creates category
  const categoryNameKo = RandomGenerator.name(2);
  const categoryNameEn = RandomGenerator.name(2);
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: categoryNameKo,
        name_en: categoryNameEn,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPassword123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 4. Seller creates a product in the category
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerAuth.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Seller creates a SKU for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        price: 12345,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 6. List images for the SKU using only default request params
  const resDefault =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {},
      },
    );
  typia.assert(resDefault);
  TestValidator.equals(
    "image data should be empty for new SKU (default params)",
    resDefault.data,
    [],
  );
  TestValidator.predicate(
    "pagination object exists (default params)",
    typeof resDefault.pagination === "object",
  );

  // 7. List images with explicit productId and skuId in body filter
  const resFiltered =
    await api.functional.shoppingMall.seller.products.skus.images.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          productId: product.id,
          skuId: sku.id,
        },
      },
    );
  typia.assert(resFiltered);
  TestValidator.equals(
    "image data should be empty for new SKU (with filter)",
    resFiltered.data,
    [],
  );
  TestValidator.predicate(
    "pagination object exists (with filter)",
    typeof resFiltered.pagination === "object",
  );
}
