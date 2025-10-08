import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a seller can update metadata for an existing product image under
 * their own product.
 *
 * Scenario:
 *
 * 1. Register as a new seller with random, valid details
 * 2. Create a product category (with unique random names in Korean and English)
 * 3. Create a product under that category (is_active: true, random
 *    name/description)
 * 4. Upload an image for this product (with valid random image URL, alt_text,
 *    display_order)
 * 5. Update the uploaded image's metadata (change alt_text, display_order, url)
 * 6. Assert image metadata in the API response matches the update request
 * 7. Assert "id", "shopping_mall_product_id" and "created_at" fields are unchanged
 *    after update
 * 8. (Do not test error or edge cases -- happy path only, no type errors)
 */
export async function test_api_product_image_update_by_seller_with_valid_changes(
  connection: api.IConnection,
) {
  // 1. Register seller & get authorized session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        business_name: sellerBusinessName,
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
        kyc_document_uri: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create a product category
  const catNameKo = RandomGenerator.name(2);
  const catNameEn = RandomGenerator.name(2);
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: catNameKo,
        name_en: catNameEn,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create a product under that category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        // No main_image_url for initial create
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Upload an image
  const imageUploadBody = {
    shopping_mall_product_id: product.id,
    url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(20)}.jpg`,
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 0,
  } satisfies IShoppingMallCatalogImage.ICreate;
  const catalogImage: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: imageUploadBody,
      },
    );
  typia.assert(catalogImage);
  TestValidator.equals(
    "image id matches",
    catalogImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "uploaded image URL matches request",
    catalogImage.url,
    imageUploadBody.url,
  );

  // 5. Update the image's metadata (alt_text, display_order, url)
  const updateBody = {
    url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(20)}.jpg`,
    alt_text: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1,
  } satisfies IShoppingMallCatalogImage.IUpdate;
  const updatedImage: IShoppingMallCatalogImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: product.id,
        imageId: catalogImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);

  // 6. Check update fields match request; unrelated fields unchanged
  TestValidator.equals("updated URL matches", updatedImage.url, updateBody.url);
  TestValidator.equals(
    "updated alt_text matches",
    updatedImage.alt_text,
    updateBody.alt_text,
  );
  TestValidator.equals(
    "updated display_order matches",
    updatedImage.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "image id unchanged after update",
    updatedImage.id,
    catalogImage.id,
  );
  TestValidator.equals(
    "shopping_mall_product_id unchanged",
    updatedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedImage.created_at,
    catalogImage.created_at,
  );
}
