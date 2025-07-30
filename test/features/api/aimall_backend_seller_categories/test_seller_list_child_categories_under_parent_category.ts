import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that a seller can list only the immediate child categories for a
 * parent category.
 *
 * This test ensures the API correctly creates and returns hierarchical category
 * structures for a seller. First, it creates a root parent category. Then, it
 * adds at least two child categories under that parent. It then uses the
 * childCategories index API to fetch the direct children of the parent and
 * verifies that:
 *
 * - The response includes all and only the direct children created
 * - Each child category has parent_id === parent.id
 * - The depth field increments appropriately from parent to child
 */
export async function test_api_aimall_backend_seller_categories_test_seller_list_child_categories_under_parent_category(
  connection: api.IConnection,
) {
  // 1. Create a root parent category
  const parentName: string = RandomGenerator.alphabets(10);
  const parentDepth: number = 1;
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: parentName,
        parent_id: null,
        depth: parentDepth,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);
  TestValidator.equals("parent is root")(parentCategory.parent_id)(null);
  TestValidator.equals("parent depth")(parentCategory.depth)(parentDepth);

  // 2. Create two child categories under the parent
  const childCats = await ArrayUtil.asyncRepeat(2)(async (i) => {
    const name = RandomGenerator.alphabets(8) + i;
    const child =
      await api.functional.aimall_backend.seller.categories.childCategories.create(
        connection,
        {
          categoryId: parentCategory.id,
          body: {
            name,
            parent_id: parentCategory.id,
            depth: parentDepth + 1,
          } satisfies IAimallBackendCategory.ICreate,
        },
      );
    typia.assert(child);
    TestValidator.equals("child parent_id")(child.parent_id)(parentCategory.id);
    TestValidator.equals("child depth")(child.depth)(parentDepth + 1);
    return child;
  });

  // 3. Fetch the immediate children of parent via childCategories index
  const result =
    await api.functional.aimall_backend.seller.categories.childCategories.index(
      connection,
      {
        categoryId: parentCategory.id,
      },
    );
  typia.assert(result);
  TestValidator.equals("expected children count")(result.data.length)(
    childCats.length,
  );
  // Check each child in response is among those created, and fields are correct
  for (const child of result.data) {
    TestValidator.predicate("child in created set")(
      childCats.some(
        (created) => created.id === child.id && created.name === child.name,
      ),
    );
    TestValidator.equals("child parent_id matches")(child.parent_id)(
      parentCategory.id,
    );
    TestValidator.equals("child depth")(child.depth)(parentDepth + 1);
  }
}
