import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate business logic enforcing referential integrity for category deletion
 * (taxonomy integrity).
 *
 * This test ensures that an administrator cannot delete a category if it still
 * has child categories attached. It exercises the constraint that prevents
 * orphaned child categories in the taxonomy structure.
 *
 * Steps:
 *
 * 1. Create a parent/root category (depth = 1; parent_id = null)
 * 2. Create a child category (depth = 2; parent_id = parent.id)
 * 3. Assert the child is correctly attached to the parent
 * 4. Attempt to delete the parent category — expect a business logic error due to
 *    non-empty child relationship
 *
 * Passing this test verifies that category deletion enforces referential
 * taxonomy constraints.
 */
export async function test_api_aimall_backend_administrator_categories_test_delete_category_with_children_admin(
  connection: api.IConnection,
) {
  // 1. Create a parent/root category
  const parentCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          depth: 1,
          parent_id: null,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 2. Create a child category under the parent
  const childCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          depth: 2,
          parent_id: parentCategory.id,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 3. Validate child-to-parent linkage and correct depth
  TestValidator.equals("child category linked to parent")(
    childCategory.parent_id,
  )(parentCategory.id);
  TestValidator.equals("child category depth is 2")(childCategory.depth)(2);

  // 4. Attempt to delete the parent category — expect error due to child dependency
  await TestValidator.error("should forbid deleting a category with children")(
    async () => {
      await api.functional.aimall_backend.administrator.categories.erase(
        connection,
        {
          categoryId: parentCategory.id,
        },
      );
    },
  );
}
