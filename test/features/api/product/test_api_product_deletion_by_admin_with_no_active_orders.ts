import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validate the admin's ability to delete a product that has no active or open
 * orders.
 *
 * This test will:
 *
 * 1. Register an admin account
 * 2. Create a category for product assignment
 * 3. Create a product associated with that category
 * 4. Delete the product using the admin API
 * 5. Confirm the product is deleted by attempting to re-delete (expect failure)
 *    and check business error handling.
 *
 * Prerequisites: No active/open orders referencing the product in this
 * scenario.
 */
export async function test_api_product_deletion_by_admin_with_no_active_orders(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a product category
  const categoryCreate = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryCreate },
  );
  typia.assert(category);

  // 3. Create a product in the above category
  const productCreate = {
    shopping_mall_seller_id: adminJoin.id, // as admin, can create as self
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // 4. Delete the product
  await api.functional.shoppingMall.admin.products.erase(connection, {
    productId: product.id,
  });

  // 5. Attempt to re-delete (should fail, as already deleted)
  await TestValidator.error(
    "deleting already-deleted product should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(connection, {
        productId: product.id,
      });
    },
  );
}
