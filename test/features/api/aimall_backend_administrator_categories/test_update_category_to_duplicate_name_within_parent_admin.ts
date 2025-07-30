import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that updating a category's name to a duplicate of an existing
 * sibling name under the same parent is prevented.
 *
 * This test is critical for taxonomy integrity by ensuring the business
 * uniqueness constraint on (parent_id, name) is enforced.
 *
 * Steps:
 *
 * 1. Create a parent category (depth=1, name: parentName)
 * 2. Create two sibling categories under the parent with unique names (e.g.,
 *    "childA", "childB") (depth=2, parent_id: parent.id)
 * 3. Attempt to update "childB" to have the same name as "childA" (using PUT on
 *    childB with name = "childA", same parent_id, depth).
 * 4. Verify that an error is thrown (TestValidator.error), confirming the
 *    uniqueness constraint is enforced.
 */
export async function test_api_aimall_backend_administrator_categories_test_update_category_to_duplicate_name_within_parent_admin(
  connection: api.IConnection,
) {
  // 1. Create parent category
  const parentName = RandomGenerator.alphaNumeric(8);
  const parent: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: parentName,
          parent_id: null,
          depth: 1,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(parent);

  // 2. Create two sibling categories under parent
  const childA: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "childA",
          parent_id: parent.id,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childA);

  const childB: IAimallBackendCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "childB",
          parent_id: parent.id,
          depth: 2,
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(childB);

  // 3. Try to update childB's name to "childA" (should fail)
  await TestValidator.error("Duplicate sibling name update must be rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.categories.update(
        connection,
        {
          categoryId: childB.id,
          body: {
            name: childA.name,
            parent_id: parent.id,
            depth: 2,
          } satisfies IAimallBackendCategory.IUpdate,
        },
      );
    },
  );
}
