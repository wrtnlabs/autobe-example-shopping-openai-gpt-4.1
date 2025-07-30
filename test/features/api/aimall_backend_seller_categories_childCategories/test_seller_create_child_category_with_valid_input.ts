import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that a seller can create a child category under an existing parent
 * category with valid data.
 *
 * This test ensures:
 *
 * - A parent category can be created by a seller with valid fields.
 * - A child category can then be created using the parent's ID as parent_id (via
 *   path param), with proper required and realistic values for the child (name,
 *   depth, etc).
 * - The resulting child category has correct parent_id linkage and valid depth
 *   (parent.depth+1), and schema is satisfied.
 * - On valid input, seller receives the created child category and linkage is
 *   confirmed.
 * - If the parent category does not exist, or permissions are invalid, the child
 *   category creation should fail (to be separately tested).
 *
 * Business Rationale: Sellers need to structure their product categories with
 * hierarchy for navigation and product arrangement. This covers the workflow
 * including setup of a parent category and adding a child under it.
 *
 * Workflow steps:
 *
 * 1. Create a parent category (using /aimall-backend/seller/categories POST).
 * 2. Use that parent's ID as categoryId path param to POST a new child category at
 *    /aimall-backend/seller/categories/{categoryId}/childCategories.
 * 3. Provide valid required fields (name, depth) in the child, depth must be
 *    parent.depth + 1.
 * 4. Verify the response matches a valid IAimallBackendCategory and parent_id
 *    link, depth is correctly set, etc.
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_seller_create_child_category_with_valid_input(
  connection: api.IConnection,
) {
  // 1. Create a parent category
  const parentName = RandomGenerator.paragraph()(1);
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: parentName,
        parent_id: null,
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 2. Create a child category under the parent
  const childName = RandomGenerator.paragraph()(1);
  const childDepth = parentCategory.depth + 1;
  const childCategory =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: childName,
          depth: childDepth,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 3. Validate parent linkage and correct hierarchy
  TestValidator.equals("parent linkage")(childCategory.parent_id)(
    parentCategory.id,
  );
  TestValidator.equals("depth")(childCategory.depth)(childDepth);
}
