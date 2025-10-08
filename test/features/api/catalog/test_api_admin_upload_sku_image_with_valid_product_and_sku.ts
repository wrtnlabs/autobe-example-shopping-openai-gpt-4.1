import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test uploading a SKU image as admin (valid case, role enforcement).
 *
 * 1. Register admin -> obtain authentication.
 * 2. Create a category with random data.
 * 3. Create a product as admin with the created category.
 * 4. Create a SKU for this product.
 * 5. Upload an image, referencing product & SKU, with random values for url,
 *    alt_text, etc.
 * 6. Assert the response type and linkage, and validate returned metadata fields.
 */
export async function test_api_admin_upload_sku_image_with_valid_product_and_sku(
  connection: api.IConnection,
) {
  // 1. Register admin user and obtain session
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a category (leaf node, is_active)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create a product with the category and admin as seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: adminAuth.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Create a SKU for that product
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 1 }),
        price: Math.floor(Math.random() * 100000) + 1000,
        status: "active",
        low_stock_threshold: typia.random<number & tags.Type<"int32">>(),
        main_image_url: typia.random<string & tags.Format<"url">>(),
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // 5. Upload an image to the SKU as admin
  const image: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.admin.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: sku.id,
          url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"url">
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(image);

  // 6. Validate linkages and required fields in the result
  TestValidator.equals(
    "image's shopping_mall_product_id",
    image.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "image's shopping_mall_product_sku_id",
    image.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.predicate(
    "image.id exists",
    typeof image.id === "string" && image.id.length > 0,
  );
  TestValidator.predicate(
    "image.url exists",
    typeof image.url === "string" && image.url.length > 0,
  );
  TestValidator.predicate(
    "image.display_order is int",
    typeof image.display_order === "number",
  );
  TestValidator.predicate(
    "image.created_at exists",
    typeof image.created_at === "string" && image.created_at.length > 0,
  );
}
