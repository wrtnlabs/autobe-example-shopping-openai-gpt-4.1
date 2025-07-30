import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validates successful update (rename) of a child product category under an
 * existing parent category by an administrator.
 *
 * Business purpose:
 *
 * - Ensures admin can change a child category's name (given correct UUIDs)
 * - Confirms parent-child relationship and sibling name uniqueness are enforced
 * - Validates API update result reflects new value and does not mutate unrelated
 *   fields
 *
 * Steps:
 *
 * 1. Create a root parent category
 * 2. Create two sibling child categories under the parent
 * 3. Update the first child category's name to a new unique value
 * 4. Assert the update succeeded and only affected the name
 * 5. Attempt update with a duplicate sibling name (should fail)
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_admin_update_child_category_name_successfully(
  connection: api.IConnection,
) {
  // 1. Create parent/root category
  const parentName = RandomGenerator.alphaNumeric(8);
  const parent: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: parentName,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parent);

  // 2. Create first child category
  const childName1 = RandomGenerator.alphaNumeric(8);
  const child1: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parent.id,
        body: {
          parent_id: parent.id,
          name: childName1,
          depth: parent.depth + 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(child1);

  // 2b. Create second child for duplicate test
  const childName2 = RandomGenerator.alphaNumeric(8);
  const child2: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parent.id,
        body: {
          parent_id: parent.id,
          name: childName2,
          depth: parent.depth + 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(child2);

  // 3. Update first child's name to unique new value
  const newName = RandomGenerator.alphaNumeric(10);
  const updated: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.update(
      connection,
      {
        categoryId: parent.id,
        childCategoryId: child1.id,
        body: {
          name: newName,
        } satisfies IAimallBackendCategory.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("child id unchanged")(updated.id)(child1.id);
  TestValidator.equals("parent id unchanged")(updated.parent_id)(parent.id);
  TestValidator.equals("name updated")(updated.name)(newName);
  TestValidator.equals("depth unchanged")(updated.depth)(child1.depth);

  // 4. Try to update first child's name to duplicate name of second child
  await TestValidator.error("category sibling names must be unique")(
    async () => {
      await api.functional.aimall_backend.administrator.categories.childCategories.update(
        connection,
        {
          categoryId: parent.id,
          childCategoryId: child1.id,
          body: {
            name: child2.name,
          } satisfies IAimallBackendCategory.IUpdate,
        },
      );
    },
  );
}
