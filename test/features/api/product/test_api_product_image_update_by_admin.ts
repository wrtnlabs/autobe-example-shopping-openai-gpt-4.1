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
 * Validates that an admin can successfully update product image metadata for a
 * product.
 *
 * 1. Registers a new admin (receiving authentication token).
 * 2. Creates a new product category.
 * 3. Creates a new product under that category.
 * 4. Uploads a new image for the product under admin context.
 * 5. Updates the image's alt_text and display_order using the admin API.
 * 6. Asserts that the returned image reflects the new data.
 */
export async function test_api_product_image_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPW123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const categoryCreate = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_ko: RandomGenerator.paragraph({ sentences: 4 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreate,
    },
  );
  typia.assert(category);

  // 3. Create product
  const productCreate = {
    shopping_mall_seller_id: admin.id, // Attribute to admin for simplicity
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 4. Upload image
  const imageCreate = {
    shopping_mall_product_id: product.id,
    url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg`,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 5. Update image metadata as admin
  const updateInput = {
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: image.display_order + 1,
    url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(12)}-updated.jpg`,
  } satisfies IShoppingMallCatalogImage.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.products.images.update(connection, {
      productId: product.id,
      imageId: image.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 6. Assertion - the updated image matches expected values
  TestValidator.equals(
    "updated alt_text",
    updated.alt_text,
    updateInput.alt_text,
  );
  TestValidator.equals(
    "updated display_order",
    updated.display_order,
    updateInput.display_order,
  );
  TestValidator.equals("updated url", updated.url, updateInput.url);
  TestValidator.equals("image ID remains the same", updated.id, image.id);
  TestValidator.equals(
    "updated product ID remains the same",
    updated.shopping_mall_product_id,
    product.id,
  );
}
