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
 * Validates admin workflow to update an existing SKU image for a product.
 *
 * The test sequence:
 *
 * 1. Register a new admin account and authenticate.
 * 2. Create a product category.
 * 3. Create a product under that category, using that admin's id as seller.
 * 4. Create a SKU for the product.
 * 5. Create an image associated with that SKU.
 * 6. Update the SKU image's metadata (display order, alt text, url).
 * 7. Validate the update is present in the returned object (values, updated_at).
 * 8. Confirm catalog relationships and update propagation.
 */
export async function test_api_admin_update_sku_image_valid_admin_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_body = {
    email: admin_email,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: admin_body,
  });
  typia.assert(admin);

  // 2. Create category
  const category_body = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: category_body },
  );
  typia.assert(category);

  // 3. Create product (using admin id as seller)
  const product_body = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: product_body },
  );
  typia.assert(product);

  // 4. Create SKU
  const sku_body = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    price: 99.99,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.admin.products.skus.create(
    connection,
    { productId: product.id, body: sku_body },
  );
  typia.assert(sku);

  // 5. Create SKU image
  const image_body = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
    url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
    display_order: 0,
    alt_text: "Primary variant image",
  } satisfies IShoppingMallCatalogImage.ICreate;
  const image =
    await api.functional.shoppingMall.admin.products.skus.images.create(
      connection,
      { productId: product.id, skuId: sku.id, body: image_body },
    );
  typia.assert(image);

  // Capture pre-update timestamp and values
  const prev_url = image.url;
  const prev_alt = image.alt_text;
  const prev_display_order = image.display_order;
  const prev_created_at = image.created_at;

  // 6. Update the SKU image's metadata
  const update_body = {
    url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
    alt_text: "Updated variant alt text", // simulate alt text update
    display_order: 2, // move to another slot in gallery
  } satisfies IShoppingMallCatalogImage.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.products.skus.images.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        imageId: image.id,
        body: update_body,
      },
    );
  typia.assert(updated);

  // 7. Validate the update
  TestValidator.notEquals("URL was updated", updated.url, prev_url);
  TestValidator.equals(
    "Display order was updated",
    updated.display_order,
    update_body.display_order,
  );
  TestValidator.equals(
    "Alt text was updated",
    updated.alt_text,
    update_body.alt_text,
  );
  TestValidator.predicate(
    "Creation date unchanged",
    updated.created_at === prev_created_at,
  );
}
