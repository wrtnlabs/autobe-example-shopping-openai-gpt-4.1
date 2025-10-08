import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test that an admin can successfully update a product SKU's name, price,
 * status, and image for an existing SKU under a product.
 *
 * Steps:
 *
 * 1. Register/join as admin and authenticate
 * 2. Create a category
 * 3. Create a product attributed to this admin & new category
 * 4. Create a SKU under the product
 * 5. Update SKU's name, price, status, and image
 * 6. Validate that SKU fields match new values
 */
export async function test_api_sku_update_admin_successful_update(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create a category
  const categoryBody = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert(category);

  // 3. Create a product
  const productBody = {
    shopping_mall_seller_id: adminAuth.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 4. Create a SKU
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    price: Math.floor(Math.random() * 100000) + 1000,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.admin.products.skus.create(
    connection,
    { productId: product.id, body: skuCreateBody },
  );
  typia.assert(sku);

  // 5. Prepare new values
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newPrice = Math.floor(Math.random() * 200000) + 4000;
  const newStatus = RandomGenerator.pick([
    "active",
    "inactive",
    "blocked",
  ] as const);
  const newImage = `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(8)}/400/300`;

  // 6. Update the SKU
  const skuUpdateBody = {
    name: newName,
    price: newPrice,
    status: newStatus,
    main_image_url: newImage,
  } satisfies IShoppingMallProductSku.IUpdate;
  const updatedSku =
    await api.functional.shoppingMall.admin.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: skuUpdateBody,
    });
  typia.assert(updatedSku);

  // 7. Validate SKU fields updated
  TestValidator.equals("sku updated name", updatedSku.name, newName);
  TestValidator.equals("sku updated price", updatedSku.price, newPrice);
  TestValidator.equals("sku updated status", updatedSku.status, newStatus);
  TestValidator.equals(
    "sku updated image",
    updatedSku.main_image_url,
    newImage,
  );
  TestValidator.equals(
    "sku unchanged shopping_mall_product_id",
    updatedSku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "sku unchanged sku_code",
    updatedSku.sku_code,
    sku.sku_code,
  );
}
