import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test that deleting a child category with active product assignments is
 * prevented.
 *
 * This test ensures that the business logic correctly rejects deletion attempts
 * on a child category if there are products currently assigned to that
 * category. This maintains category-product referential integrity and prevents
 * data inconsistencies.
 *
 * Steps:
 *
 * 1. Create a parent category (depth=1, no parent_id)
 * 2. Add a child category under the parent (depth=2)
 * 3. Create a product that references the child category via its category_id
 * 4. Attempt to delete the child category, expect an error from the API
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_delete_child_category_with_active_products_should_fail(
  connection: api.IConnection,
) {
  // 1. Create parent category (depth 1, no parent_id)
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. Create child category (depth 2, parent is parentCategory.id)
  const childCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: RandomGenerator.alphabets(10),
          // parent_id is set implicitly by endpoint from path
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 3. Create a product referencing the child category
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: childCategory.id,
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(5),
          description: RandomGenerator.paragraph()(2),
          // main_thumbnail_uri is optional, omit for simplicity
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Attempt to delete the child category; must fail because a product is assigned to it
  await TestValidator.error(
    "deleting child category referenced by a product should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.childCategories.erase(
      connection,
      {
        categoryId: parentCategory.id,
        childCategoryId: childCategory.id,
      },
    );
  });
}
