import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate error response when a seller attempts to update a child category
 * with invalid or non-existent category IDs.
 *
 * This test ensures the backend correctly handles attempts to update
 * relationships that do not exist, reinforcing integrity of category
 * hierarchies and preventing unintended data mutations.
 *
 * **Test objectives:**
 *
 * 1. Use non-existent (random) UUID for parent (categoryId)
 * 2. Use non-existent (random) UUID for child (childCategoryId)
 * 3. Prepare a valid-looking update payload (e.g., only updating name, depth, and
 *    parent_id)
 * 4. Attempt update and validate that an error occurs (e.g., not found, relation
 *    mismatch)
 * 5. Ensure no accidental update returns success or modified data
 *
 * **Steps:**
 *
 * 1. Generate random UUIDs for both parent and child category IDs, ensuring they
 *    are not existing in the DB.
 * 2. Prepare a valid `IAimallBackendCategory.IUpdate` payload with plausible
 *    values.
 * 3. Call the update endpoint using these IDs and the payload, expecting an error.
 * 4. Assert that an error is thrown using `TestValidator.error`.
 */
export async function test_api_aimall_backend_seller_categories_childCategories_test_seller_update_child_category_with_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Generate random UUIDs for both parent (categoryId) and child (childCategoryId) that are guaranteed not to exist
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();
  const invalidChildCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a valid update payload
  const updatePayload = {
    name: "Updated Nonexistent Child Category",
    depth: 2,
    parent_id: invalidCategoryId,
  } satisfies IAimallBackendCategory.IUpdate;

  // 3. Call the update API and assert that an error is thrown
  await TestValidator.error(
    "Should fail to update when using invalid or non-existent IDs",
  )(async () => {
    await api.functional.aimall_backend.seller.categories.childCategories.update(
      connection,
      {
        categoryId: invalidCategoryId,
        childCategoryId: invalidChildCategoryId,
        body: updatePayload,
      },
    );
  });
}
