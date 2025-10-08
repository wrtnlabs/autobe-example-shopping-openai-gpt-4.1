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
 * Test that a seller cannot update the image metadata for a product they do not
 * own. Scenario includes registering two sellers: Seller A creates a category,
 * product, and product image. Seller B is authenticated separately and attempts
 * to update the image for Seller A's product. Validate the endpoint returns a
 * permission error and does not update the image.
 */
export async function test_api_product_image_update_by_seller_unauthorized_product(
  connection: api.IConnection,
) {
  // 1. Seller A registers
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "passwordA!123",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAJoin);

  // 2. Seller A creates a category
  const categoryInput = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryInput },
  );
  typia.assert(category);

  // 3. Seller A creates a product in this category
  const productInput = {
    shopping_mall_seller_id: sellerAJoin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 4. Seller A uploads a product image
  const imageInput = {
    shopping_mall_product_id: product.id,
    url: "https://test-image-cdn/" + RandomGenerator.alphaNumeric(12),
    display_order: 0,
  } satisfies IShoppingMallCatalogImage.ICreate;
  const image = await api.functional.shoppingMall.seller.products.images.create(
    connection,
    { productId: product.id, body: imageInput },
  );
  typia.assert(image);

  // 5. Seller B registers
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "passwordB!456",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerBJoin);

  // 6. Seller B tries to update Seller A's product image
  const updateBody = {
    alt_text: "Unauthorized image update by B",
    display_order: 1,
  } satisfies IShoppingMallCatalogImage.IUpdate;
  await TestValidator.error(
    "Seller B cannot update Seller A's product image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        connection,
        {
          productId: product.id,
          imageId: image.id,
          body: updateBody,
        },
      );
    },
  );
}
