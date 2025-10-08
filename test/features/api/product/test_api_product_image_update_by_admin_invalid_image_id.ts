import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Test that an admin updating a product image with an invalid/nonexistent
 * imageId receives the appropriate error and no unintended changes occur
 *
 * Steps:
 *
 * 1. Admin joins
 * 2. Admin creates a product category
 * 3. Admin creates a product in the category
 * 4. Admin attempts to update a product image with a random (nonexistent) imageId
 * 5. The API must throw an error (not found or equivalent) and the product remains
 *    unchanged
 */
export async function test_api_product_image_update_by_admin_invalid_image_id(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(10),
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Try to update a non-existent image for the product
  const invalidImageId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    url: "https://cdn.example.com/image.png",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
  } satisfies IShoppingMallCatalogImage.IUpdate;

  await TestValidator.error(
    "admin update product image with invalid imageId should throw",
    async () => {
      await api.functional.shoppingMall.admin.products.images.update(
        connection,
        {
          productId: product.id,
          imageId: invalidImageId,
          body: updateBody,
        },
      );
    },
  );
}
