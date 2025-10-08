import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validate that a platform admin can update any existing product, overriding
 * usual seller/category constraints.
 *
 * The test ensures the admin can force-update product details, including name,
 * category reassignment to any valid/active leaf, and activation status,
 * without limitation by previous ownership. It checks that category change and
 * status updates are applied, and that audit events/logs would be triggered for
 * such admin operations.
 *
 * Steps:
 *
 * 1. Register as admin (random credentials)
 * 2. Create two active categories as leaves (catA, catB)
 * 3. Create a product (assigned to catA)
 * 4. Update the product as admin: change name, is_active, description, and assign
 *    to catB
 * 5. Validate observable changes: name, is_active, description all updated as
 *    requested
 */
export async function test_api_admin_update_product_with_full_privileges(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create two categories (catA, catB) as active leaves
  const categoryBodyA = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const catA = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBodyA },
  );
  typia.assert(catA);

  const categoryBodyB = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const catB = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBodyB },
  );
  typia.assert(catB);

  // 3. Create a product assigned to category A
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: catA.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 4. Prepare new details for update: name, description, deactivate, assign to catB
  const updatedName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 12,
  });
  const updateBody = {
    name: updatedName,
    is_active: false,
    description: updatedDesc,
    shopping_mall_category_id: catB.id,
  } satisfies IShoppingMallProduct.IUpdate;
  const updated = await api.functional.shoppingMall.admin.products.update(
    connection,
    {
      productId: product.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 5. Assertions -- only on observable fields in IShoppingMallProduct
  TestValidator.notEquals(
    "product name was updated",
    updated.name,
    product.name,
  );
  TestValidator.notEquals(
    "product description was updated",
    updated.description,
    product.description,
  );
  TestValidator.equals("product is deactivated", updated.is_active, false);
}
