import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate the category name uniqueness constraint when updating a child
 * category under a parent.
 *
 * This test verifies that the API properly enforces the unique constraint on
 * category names among siblings within the same parent. Specifically, if a
 * seller attempts to update a child category's name to the same name as another
 * sibling (same parent), the API should return a unique constraint/business
 * error rather than allowing the update.
 *
 * Business scenario:
 *
 * 1. Create a parent category (root or any depth).
 * 2. Under the parent, create two child categories, each with a unique name (e.g.,
 *    "Alpha", "Beta").
 * 3. Attempt to update the name of one child to the exact name of the other
 *    sibling under the same parent.
 * 4. Expect an error (unique constraint violation) when attempting this update.
 *
 * Steps:
 *
 * 1. Create parent category via
 *    api.functional.aimall_backend.seller.categories.create
 * 2. Create child A:
 *    api.functional.aimall_backend.seller.categories.childCategories.create
 * 3. Create child B:
 *    api.functional.aimall_backend.seller.categories.childCategories.create
 * 4. Attempt to update child A’s name to child B’s name using
 *    api.functional.aimall_backend.seller.categories.childCategories.update
 * 5. Use TestValidator.error to verify an error occurs due to duplicate name
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_seller_update_child_category_duplicate_name_failure(
  connection: api.IConnection,
) {
  // 1. Create a parent category (root)
  const parentCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "UniqueParent-" + RandomGenerator.alphaNumeric(8),
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 2. Create child category A
  const childA =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: "UniqueAlpha-" + RandomGenerator.alphaNumeric(8),
          depth: 2,
          parent_id: parentCategory.id,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childA);

  // 3. Create child category B with a different unique name
  const childB =
    await api.functional.aimall_backend.seller.categories.childCategories.create(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          name: "UniqueBeta-" + RandomGenerator.alphaNumeric(8),
          depth: 2,
          parent_id: parentCategory.id,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childB);

  // 4. Try to update child A’s name to be identical to child B’s
  await TestValidator.error(
    "Should not allow duplicate child category name under same parent",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.update(
      connection,
      {
        categoryId: parentCategory.id,
        childCategoryId: childA.id,
        body: { name: childB.name } satisfies IAimallBackendCategory.IUpdate,
      },
    );
  });
}
