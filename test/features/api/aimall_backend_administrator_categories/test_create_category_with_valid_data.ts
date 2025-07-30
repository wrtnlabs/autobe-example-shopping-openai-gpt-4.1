import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate administrator can create a new product category (taxonomy node).
 *
 * This test ensures that an administrator can successfully create a product
 * category by specifying all required fields:
 *
 * - Name (atomic, unique among siblings)
 * - Parent_id (optional, null for root, required for sub-category)
 * - Depth (must reflect the correct level in the hierarchy, root=1)
 *
 * Business context: E-commerce platforms require well-structured product
 * taxonomies for navigation and search. Category hierarchy integrity must be
 * preserved. Admins can create root or sub-categories. Root categories have
 * null parent_id and depth=1; sub-categories reference a parent and increment
 * depth accordingly.
 *
 * Test procedure:
 *
 * 1. Create a root category (parent_id=null, depth=1, name=random unique)
 * 2. Validate output: returned category has expected name, parent_id=null, depth=1
 * 3. Create a sub-category under the root (parent_id=root.id, depth=2, name=random
 *    unique)
 * 4. Validate output: returned category has expected name, correct parent_id,
 *    depth=2
 */
export async function test_api_aimall_backend_administrator_categories_test_create_category_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create root category
  const rootName = RandomGenerator.alphaNumeric(12);
  const rootInput: IAimallBackendCategory.ICreate = {
    name: rootName,
    parent_id: null,
    depth: 1,
  };
  const rootCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      { body: rootInput },
    );
  typia.assert(rootCategory);

  // 2. Validate root output
  TestValidator.equals("category name matches")(rootCategory.name)(rootName);
  TestValidator.equals("category parent_id is null")(rootCategory.parent_id)(
    null,
  );
  TestValidator.equals("category depth is 1")(rootCategory.depth)(1);

  // 3. Create sub-category (child of root)
  const subName = RandomGenerator.alphaNumeric(12);
  const subInput: IAimallBackendCategory.ICreate = {
    name: subName,
    parent_id: rootCategory.id,
    depth: 2,
  };
  const subCategory: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      { body: subInput },
    );
  typia.assert(subCategory);

  // 4. Validate sub-category output
  TestValidator.equals("subcategory name matches")(subCategory.name)(subName);
  TestValidator.equals("subcategory parent_id matches root id")(
    subCategory.parent_id,
  )(rootCategory.id);
  TestValidator.equals("subcategory depth is 2")(subCategory.depth)(2);
}
