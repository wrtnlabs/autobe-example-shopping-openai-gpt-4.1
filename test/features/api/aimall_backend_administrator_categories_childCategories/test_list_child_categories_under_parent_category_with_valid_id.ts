import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate listing of direct child categories under a parent category.
 *
 * This E2E test verifies correct retrieval of immediate child categories given
 * a parent category's UUID. It assesses both:
 *
 * - Positive case: parent with children returns all and only direct descendants.
 * - Negative case: leaf category with no children yields empty result set.
 *
 * Steps:
 *
 * 1. Create a root category with no parent (depth = 1).
 * 2. Create several child categories under the root (depth = 2, parent_id = root's
 *    id, unique names).
 * 3. List direct children using the childCategories endpoint for the root.
 *
 *    - Assert all results have parent_id==root.id, depth==2, and correct name
 *         linkage.
 *    - Assert count and presence of each created child in the results.
 * 4. For a selected leaf child (with no children), assert its own children result
 *    is empty.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_list_child_categories_under_parent_category_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a root category (no parent, depth = 1)
  const rootName: string = RandomGenerator.alphaNumeric(10);
  const rootCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: rootName,
          depth: 1,
          parent_id: null,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(rootCategory);
  TestValidator.equals("root has null parent_id")(rootCategory.parent_id)(null);
  TestValidator.equals("root depth is 1")(rootCategory.depth)(1);

  // 2. Create several children attached to root (depth = 2)
  const childCount = 3;
  const childNames = ArrayUtil.repeat(childCount)(() =>
    RandomGenerator.alphaNumeric(8),
  );
  const children = await ArrayUtil.asyncRepeat(childCount)(async (idx) => {
    const name = childNames[idx];
    const child =
      await api.functional.aimall_backend.administrator.categories.childCategories.create(
        connection,
        {
          categoryId: rootCategory.id,
          body: {
            name,
            depth: 2,
          } satisfies IAimallBackendCategory.ICreate,
        },
      );
    typia.assert(child);
    TestValidator.equals("parent_id links to root")(child.parent_id)(
      rootCategory.id,
    );
    TestValidator.equals("depth is 2")(child.depth)(2);
    TestValidator.equals("name matches")(child.name)(name);
    return child;
  });

  // 3. List children via the tested endpoint and validate all fields
  const paginated =
    await api.functional.aimall_backend.administrator.categories.childCategories.index(
      connection,
      {
        categoryId: rootCategory.id,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("child count matches")(paginated.data.length)(
    childCount,
  );
  for (const child of children) {
    const match = paginated.data.find((x) => x.id === child.id);
    TestValidator.predicate("child is in listed children")(!!match);
    if (match) {
      TestValidator.equals("listed child parent_id matches")(match.parent_id)(
        rootCategory.id,
      );
      TestValidator.equals("child depth is 2")(match.depth)(2);
      TestValidator.equals("child name matches")(match.name)(child.name);
    }
  }

  // 4. Validate empty children result for a leaf category
  const leafChild = children[0];
  const leafChildren =
    await api.functional.aimall_backend.administrator.categories.childCategories.index(
      connection,
      {
        categoryId: leafChild.id,
      },
    );
  typia.assert(leafChildren);
  TestValidator.equals("leaf child has no children")(leafChildren.data.length)(
    0,
  );
}
