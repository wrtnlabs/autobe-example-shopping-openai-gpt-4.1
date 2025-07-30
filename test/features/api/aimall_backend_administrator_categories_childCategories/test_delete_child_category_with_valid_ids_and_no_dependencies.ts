import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test hard deletion of a child category under a parent category
 *
 * This test covers the business scenario where an administrator needs to delete
 * a child category that has no associated products and is not a parent to any
 * further subcategories. This ensures the deletion logic works for non-root
 * nodes without dependencies.
 *
 * Step-by-step:
 *
 * 1. Create a parent category using the administrator create endpoint
 * 2. Add a child category under the parent category (with no products or
 *    subcategories)
 * 3. Perform a hard delete on this child category using correct parent/child IDs
 * 4. Attempt to delete again and check error scenario (should fail)
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_delete_child_category_with_valid_ids_and_no_dependencies(
  connection: api.IConnection,
) {
  // 1. Create a parent category
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: RandomGenerator.alphabets(8),
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. Create a child category under parent
  const childCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          parent_id: parentCategory.id,
          name: RandomGenerator.alphabets(10),
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 3. Hard delete the child category
  await api.functional.aimall_backend.administrator.categories.childCategories.erase(
    connection,
    {
      categoryId: parentCategory.id,
      childCategoryId: childCategory.id,
    },
  );

  // 4. Attempt to delete again (error scenario -- should throw)
  await TestValidator.error(
    "remove of already removed child category should fail",
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
