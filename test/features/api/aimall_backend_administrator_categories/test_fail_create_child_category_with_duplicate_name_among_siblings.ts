import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that creating two child categories with identical names under the
 * same parent category fails due to the (parent_id, name) unique constraint.
 * The first creation should succeed, but the second attempt with the same name
 * must result in an error.
 *
 * Steps:
 *
 * 1. Create a unique parent category to house child categories.
 * 2. Under this parent, create the first child category with a chosen name (this
 *    must succeed).
 * 3. Attempt to create a second child category under the same parent, using the
 *    exact same name (should trigger uniqueness constraint error).
 * 4. Assert the first child creation works as expected, and the duplicate creation
 *    fails (verify with TestValidator.error).
 */
export async function test_api_aimall_backend_administrator_categories_test_fail_create_child_category_with_duplicate_name_among_siblings(
  connection: api.IConnection,
) {
  // 1. Create a unique parent category
  const parentName = RandomGenerator.alphabets(10);
  const parentDepth = 1; // root depth
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: parentName,
          depth: parentDepth,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. Create the first child category under the parent
  const childName = RandomGenerator.alphabets(8);
  const childDepth = parentCategory.depth + 1;
  const firstChild =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName,
          depth: childDepth,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(firstChild);
  TestValidator.equals("child parent linkage")(firstChild.parent_id)(
    parentCategory.id,
  );
  TestValidator.equals("child name")(firstChild.name)(childName);

  // 3. Attempt to create duplicate-named child
  TestValidator.error(
    "should not allow duplicate child name under same parent",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName,
          depth: childDepth,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  });
}
