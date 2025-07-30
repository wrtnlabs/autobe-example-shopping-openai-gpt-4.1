import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test failure when updating a child category with a non-existent or incorrect
 * parentId or childCategoryId.
 *
 * This test attempts to update a child category using random, non-existent
 * parentId (categoryId) and childCategoryId values. The target API operation
 * should fail, returning an error indicating that the resource cannot be found
 * or the reference is invalid. No unintended data mutation should occur for
 * such invalid attempts. Implementation does not attempt deeper relationship
 * mismatch or pre/post data validation since no category creation/lookup
 * endpoint is available in the provided SDK.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for categoryId and childCategoryId, which are almost
 *    guaranteed to be absent in the DB.
 * 2. Prepare a valid update payload according to IAimallBackendCategory.IUpdate.
 * 3. Call the update API and check that an error is thrown, confirming proper
 *    error handling for non-existent IDs.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_admin_update_child_category_with_invalid_parent_or_child(
  connection: api.IConnection,
) {
  // 1. Generate random, likely non-existent UUIDs for parent and child category IDs
  const fakeParentId: string = typia.random<string & tags.Format<"uuid">>();
  const fakeChildId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a valid category update payload
  const updateBody: IAimallBackendCategory.IUpdate = {
    name: "Invalid Test Category",
    depth: 2,
  };

  // 3. Attempt to update with invalid IDs; verify error is thrown
  await TestValidator.error(
    "updating with invalid parentId/childCategoryId should fail",
  )(() =>
    api.functional.aimall_backend.administrator.categories.childCategories.update(
      connection,
      {
        categoryId: fakeParentId,
        childCategoryId: fakeChildId,
        body: updateBody,
      },
    ),
  );
}
