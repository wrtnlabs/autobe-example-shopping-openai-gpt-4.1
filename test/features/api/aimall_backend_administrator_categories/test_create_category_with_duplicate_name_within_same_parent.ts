import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that creation of a duplicate category under the same parent is
 * prohibited.
 *
 * This test ensures the backend enforces the uniqueness constraint on
 * (parent_id, name) among sibling categories. Attempting to create two
 * categories (as siblings under the same parent or as root-level categories
 * with the same name and null parent) with identical names should result in a
 * conflict or validation error on the second creation. This prevents ambiguous
 * taxonomy and upholds category uniqueness at each hierarchical level.
 *
 * Process:
 *
 * 1. Create a parent category (can be root or any level).
 * 2. Under this parent, create a child category with a specific name (e.g.,
 *    "DuplicateNameTest").
 * 3. Attempt to create another child category under the same parent (same
 *    parent_id) with exactly the same name.
 * 4. Expect a conflict, validation, or business error, confirming the uniqueness
 *    constraint is enforced. The error should be properly caught, and the test
 *    should pass if the error is thrown.
 * 5. Also consider edge case when parent_id is null (root-level). Try to create
 *    two root categories with the same name, and expect failure on duplicate
 *    creation.
 */
export async function test_api_aimall_backend_administrator_categories_test_create_category_with_duplicate_name_within_same_parent(
  connection: api.IConnection,
) {
  // 1. Create a parent category (for non-root case).
  const parent =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          depth: 1,
          parent_id: null,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parent);

  // 2. Create a child category under this parent with a unique name.
  const childName = RandomGenerator.alphaNumeric(12);
  const child =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: childName,
          depth: parent.depth + 1,
          parent_id: parent.id,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(child);

  // 3. Attempt to create duplicate child category under same parent.
  await TestValidator.error(
    "Duplicate category name under same parent should be rejected",
  )(() =>
    api.functional.aimall_backend.administrator.categories.create(connection, {
      body: {
        name: childName,
        depth: parent.depth + 1,
        parent_id: parent.id,
      } satisfies IAimallBackendCategory.ICreate,
    }),
  );

  // 4. (Edge case) - Try on root level: create two root categories with the same name
  const rootCatName = RandomGenerator.alphaNumeric(14);
  const rootA =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: rootCatName,
          depth: 1,
          parent_id: null,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(rootA);

  await TestValidator.error(
    "Duplicate root-level category name should be rejected",
  )(() =>
    api.functional.aimall_backend.administrator.categories.create(connection, {
      body: {
        name: rootCatName,
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    }),
  );
}
