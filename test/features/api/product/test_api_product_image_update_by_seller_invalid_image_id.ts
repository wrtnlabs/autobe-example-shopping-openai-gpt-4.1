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
 * Validate that updating a product image with an invalid imageId results in an
 * error and does not alter image state.
 *
 * This test follows the flow:
 *
 * 1. Register a new seller (valid authentication)
 * 2. Create an admin category
 * 3. Seller creates a product under that category
 * 4. Attempt to update a product image with a random (invalid) imageId: expect an
 *    error (not found/404)
 */
export async function test_api_product_image_update_by_seller_invalid_image_id(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password123@!!",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create admin category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Attempt product image update with non-existent imageId
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent image id should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        connection,
        {
          productId: product.id,
          imageId: nonExistentImageId,
          body: {
            url: "https://cdn.example.com/new-fake-img.jpg",
            alt_text: "Fake image alt text",
            display_order: 1,
          } satisfies IShoppingMallCatalogImage.IUpdate,
        },
      );
    },
  );
}
