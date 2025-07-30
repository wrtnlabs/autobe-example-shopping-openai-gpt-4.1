import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate detail retrieval of a child category in taxonomy hierarchy.
 *
 * This test verifies that when a parent category and its child category are
 * created, the API for fetching a specific child category (with both parent and
 * child UUIDs) returns the child category's complete data, and enforces correct
 * linkage in the taxonomy tree.
 *
 * Steps:
 *
 * 1. Create a parent category (depth=1, null parent_id)
 * 2. Create a child category under the parent (depth=2, parent_id set to parent's
 *    id)
 * 3. Fetch the detail of the child using the dedicated GET endpoint, providing
 *    both the parent's and child's UUIDs
 * 4. Assert that the returned object:
 *
 *    - Exists and matches IAimallBackendCategory structure
 *    - Has id matching the child, parent_id matching the parent id
 *    - Includes correct name and depth values
 *    - Is fully populated (no missing fields), and depth is one more than the parent
 *    - All values correspond to what was provided/created
 */
export async function test_api_aimall_backend_administrator_categories_test_get_child_category_detail_with_valid_parent_and_child(
  connection: api.IConnection,
) {
  // 1. Create parent category (root)
  const parentInput: IAimallBackendCategory.ICreate = {
    name: RandomGenerator.alphaNumeric(8),
    parent_id: null,
    depth: 1,
  };
  const parent: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      { body: parentInput },
    );
  typia.assert(parent);
  TestValidator.equals("parent depth")(parent.depth)(1);
  TestValidator.equals("parent parent_id is null")(parent.parent_id)(null);

  // 2. Create child category under parent (depth=2, correct parent_id)
  const childName = RandomGenerator.alphaNumeric(10);
  const childInput: IAimallBackendCategory.ICreate = {
    name: childName,
    parent_id: parent.id,
    depth: 2,
  };
  const child: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: parent.id,
        body: childInput,
      },
    );
  typia.assert(child);
  TestValidator.equals("child parent_id")(child.parent_id)(parent.id);
  TestValidator.equals("child depth")(child.depth)(2);
  TestValidator.equals("child name")(child.name)(childName);

  // 3. Retrieve child details with both parent and child UUIDs
  const result: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.childCategories.at(
      connection,
      {
        categoryId: parent.id,
        childCategoryId: child.id,
      },
    );
  typia.assert(result);

  // 4. Validate returned object matches the created child category
  TestValidator.equals("child id")(result.id)(child.id);
  TestValidator.equals("child parent_id matches parent")(result.parent_id)(
    parent.id,
  );
  TestValidator.equals("child name")(result.name)(childName);
  TestValidator.equals("child depth is one more than parent")(result.depth)(
    parent.depth + 1,
  );
}
