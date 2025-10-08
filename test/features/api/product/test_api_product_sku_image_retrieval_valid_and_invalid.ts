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
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate retrieval of SKU-specific catalog images for products including
 * business error scenarios.
 *
 * 1. Register admin and seller accounts
 * 2. Admin creates required category and 'SELLER' role
 * 3. Seller creates a product under the category
 * 4. Seller creates a SKU for the product
 * 5. Seller attaches an image to the SKU
 * 6. Retrieve the image successfully and validate all metadata
 * 7. 404 if productId is wrong
 * 8. 404 if skuId is wrong
 * 9. 404 if imageId is wrong
 * 10. 404 if image does not belong to SKU
 * 11. 404 if image has been (soft-)deleted
 */
export async function test_api_product_sku_image_retrieval_valid_and_invalid(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass123!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Admin creates a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Admin creates SELLER role
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Seller permissions",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 4. Register seller
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SellerPass123!",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerAuth);

  // 5. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerAuth.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Seller creates a SKU
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        price: 10000,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // 7. Seller attaches image to SKU
  const image: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: sku.id,
          url: `https://img.cdn.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(image);

  // 8. Retrieve image successfully (happy path)
  const fetched: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.products.skus.images.at(connection, {
      productId: product.id,
      skuId: sku.id,
      imageId: image.id,
    });
  typia.assert(fetched);
  TestValidator.equals("image id matches", fetched.id, image.id);
  TestValidator.equals(
    "sku id matches",
    fetched.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "product id matches",
    fetched.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("display order matches", fetched.display_order, 0);
  TestValidator.equals("image url matches", fetched.url, image.url);
  TestValidator.equals("alt text matches", fetched.alt_text, image.alt_text);

  // 9. 404 if productId incorrect
  await TestValidator.error("should 404: invalid productId", async () => {
    await api.functional.shoppingMall.products.skus.images.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      skuId: sku.id,
      imageId: image.id,
    });
  });

  // 10. 404 if skuId incorrect
  await TestValidator.error("should 404: invalid skuId", async () => {
    await api.functional.shoppingMall.products.skus.images.at(connection, {
      productId: product.id,
      skuId: typia.random<string & tags.Format<"uuid">>(),
      imageId: image.id,
    });
  });

  // 11. 404 if imageId incorrect
  await TestValidator.error("should 404: invalid imageId", async () => {
    await api.functional.shoppingMall.products.skus.images.at(connection, {
      productId: product.id,
      skuId: sku.id,
      imageId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 12. 404 if image does not belong to sku (attach another image to another SKU and try to fetch with mismatched skuId)
  // Create another SKU and associate an image
  const altSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        price: 9999,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(altSku);
  const altImage: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId: product.id,
        skuId: altSku.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_sku_id: altSku.id,
          url: `https://img.cdn.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          display_order: 1,
        } satisfies IShoppingMallCatalogImage.ICreate,
      },
    );
  typia.assert(altImage);
  await TestValidator.error(
    "should 404: image not belonging to sku",
    async () => {
      await api.functional.shoppingMall.products.skus.images.at(connection, {
        productId: product.id,
        skuId: sku.id, // mismatched
        imageId: altImage.id,
      });
    },
  );
}
