import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Verify retrieval of a valid child category under a specific parent category
 * by seller/administrator users.
 *
 * This test ensures that providing correct parent and child category IDs
 * retrieves full details of the child category, with all schema fields present
 * and the parent-child link established. Process:
 *
 * 1. Create a root (parent) category.
 * 2. Create a child category nested under the parent.
 * 3. Retrieve child details using the GET API.
 * 4. Assert all key fields and linkage correctness.
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_get_child_category_details_with_valid_parent_and_child_ids(
  connection: api.IConnection,
) {
  // 1. Create a parent (root) category
  const parentCategoryInput: IAimallBackendCategory.ICreate = {
    name: RandomGenerator.alphaNumeric(8),
    depth: 1,
    parent_id: null,
  };
  const parent: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: parentCategoryInput,
    });
  typia.assert(parent);
  TestValidator.equals("parent has no parent_id")(parent.parent_id)(null);
  TestValidator.equals("parent depth")(parent.depth)(1);
  TestValidator.equals("parent name")(parent.name)(parentCategoryInput.name);

  // 2. Create a child category under this parent
  const childCategoryInput: IAimallBackendCategory.ICreate = {
    name: RandomGenerator.alphaNumeric(10),
    depth: 2,
  };
  const child: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parent.id,
        body: childCategoryInput,
      },
    );
  typia.assert(child);
  TestValidator.equals("child parent_id")(child.parent_id)(parent.id);
  TestValidator.equals("child depth")(child.depth)(2);
  TestValidator.equals("child name")(child.name)(childCategoryInput.name);

  // 3. Retrieve the child by GET using parent id and child id
  const read: IAimallBackendCategory =
    await api.functional.aimall_backend.seller.categories.childCategories.at(
      connection,
      {
        categoryId: parent.id,
        childCategoryId: child.id,
      },
    );
  typia.assert(read);

  // 4. Assert all fields and linkage
  TestValidator.equals("child id matches")(read.id)(child.id);
  TestValidator.equals("child parent_id matches")(read.parent_id)(parent.id);
  TestValidator.equals("child name matches")(read.name)(child.name);
  TestValidator.equals("child depth matches")(read.depth)(child.depth);
}
