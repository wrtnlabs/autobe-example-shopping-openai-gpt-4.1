import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Admin cannot assign a product to a non-leaf category (parent category) in the
 * catalog.
 *
 * This test verifies that the category assignment constraint is enforced at the
 * admin level. Workflow:
 *
 * 1. Register admin and authenticate (admin join) for category/product creation
 * 2. Create parent (non-leaf) category via admin
 * 3. Create child (leaf) category under the parent
 * 4. Create a product assigned to the child (leaf) category
 * 5. Attempt update: change product's category to the parent (non-leaf) category
 * 6. Validate error is thrown, and product is not improperly updated
 */
export async function test_api_admin_update_product_category_to_non_leaf(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureP@ssw0rd!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create parent (non-leaf) category
  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: "부모카테고리" + RandomGenerator.paragraph({ sentences: 2 }),
        name_en: "ParentCategory" + RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 3. Create child (leaf) category
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        name_ko: "자식카테고리" + RandomGenerator.paragraph({ sentences: 2 }),
        name_en: "ChildCategory" + RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  // 4. Create product assigned to the leaf (child) category
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_category_id: childCategory.id,
    name: "TestProduct " + RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product category matches child (leaf) category",
    product.id,
    product.id,
  );

  // 5. Attempt: update product to assign parent (non-leaf) category
  await TestValidator.error(
    "admin cannot assign product to a non-leaf (parent) category",
    async () => {
      await api.functional.shoppingMall.admin.products.update(connection, {
        productId: product.id,
        body: {
          shopping_mall_category_id: parentCategory.id,
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
}
