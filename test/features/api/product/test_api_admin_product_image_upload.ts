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
 * Validate that admin can upload an image to a product for catalog management.
 *
 * 1. Register and authenticate as admin.
 * 2. Create a top-level product category.
 * 3. Create a product assigned to that category, using the admin's id.
 * 4. Upload an image to the product as admin (valid url, default alt
 *    text/displ.order).
 * 5. Confirm the response structure and linkage (product id, fields match input,
 *    type/size valid, image id returned).
 * 6. Validate that unauthorized upload is not permitted (error check skipped as
 *    only admin-access available).
 */
export async function test_api_admin_product_image_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(10),
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create top-level category
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

  // 3. Create product assigned to category and admin as seller
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        // main_image_url omitted, as we add via images API
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Upload an image for this product (required fields only)
  const imageCreate = {
    shopping_mall_product_id: product.id,
    url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg`,
    display_order: 0,
  } satisfies IShoppingMallCatalogImage.ICreate;
  const image = await api.functional.shoppingMall.admin.products.images.create(
    connection,
    {
      productId: product.id,
      body: imageCreate,
    },
  );
  typia.assert(image);
  TestValidator.equals(
    "image product link is correct",
    image.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate(
    "image URL matches input",
    image.url === imageCreate.url,
  );
  TestValidator.predicate(
    "image display order matches",
    image.display_order === imageCreate.display_order,
  );
  TestValidator.predicate(
    "image id format",
    typeof image.id === "string" && image.id.length > 0,
  );
  TestValidator.predicate(
    "catalog image metadata includes timestamp",
    typeof image.created_at === "string" && image.created_at.length > 0,
  );
}
