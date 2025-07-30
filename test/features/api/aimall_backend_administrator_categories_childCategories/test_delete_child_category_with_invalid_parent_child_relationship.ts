import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test deletion of a child category under a mismatched parent_id relationship
 *
 * Business Context: In product category management, each category can be nested
 * under a parent category (via parent_id). Deleting a child category is only
 * allowed if the child’s parent_id matches the parent categoryId given in the
 * path. If there’s a mismatch (i.e., if you try to delete a child under the
 * wrong parent), the API must reject the operation.
 *
 * This test ensures that the API properly enforces parent-child relationships
 * and doesn’t delete a category when the parent-child relationship isn’t
 * correct, preventing accidental or unauthorized deletions.
 *
 * Workflow:
 *
 * 1. Create two distinct parent categories (parentA and parentB)
 * 2. Create a child category under parentA
 * 3. Attempt to delete the child using parentB’s id as the parent path parameter
 *    and the child’s id as the child path parameter
 * 4. Verify that the API returns an error (i.e., does not delete the child since
 *    parent_id does not match)
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_delete_child_category_with_invalid_parent_child_relationship(
  connection: api.IConnection,
) {
  // 1. Create parentA (root category)
  const parentA =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentA);

  // 2. Create parentB (another root category)
  const parentB =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parentB);

  // 3. Create child under parentA
  const child =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parentA.id,
        body: {
          name: RandomGenerator.alphabets(10),
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(child);

  // 4. Attempt to delete the child using the wrong parent (parentB)
  await TestValidator.error("Should not delete child with mismatched parent")(
    async () => {
      await api.functional.aimall_backend.administrator.categories.childCategories.erase(
        connection,
        {
          categoryId: parentB.id,
          childCategoryId: child.id,
        },
      );
    },
  );
}
