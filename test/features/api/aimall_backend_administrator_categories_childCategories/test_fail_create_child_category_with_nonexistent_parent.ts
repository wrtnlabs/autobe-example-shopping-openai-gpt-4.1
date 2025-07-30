import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate child category creation fails when the parent category does not
 * exist.
 *
 * This E2E test confirms that the API enforces referential integrity by
 * refusing to create a child category under a random (nonexistent) parent
 * categoryId. It helps ensure system robustness and data integrity.
 *
 * Workflow:
 *
 * 1. Generate a random UUID for a parent categoryId that cannot exist in the DB.
 * 2. Construct a valid child category creation payload (with name and depth),
 *    omitting parent_id as the endpoint injects it.
 * 3. Attempt to create a child category using the childCategories.create endpoint.
 * 4. Assert that the operation throws an error (such as 404 Not Found or
 *    referential/business logic error).
 * 5. Confirm that no category object is created for an invalid parent.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_fail_create_child_category_with_nonexistent_parent(
  connection: api.IConnection,
) {
  // 1. Generate a random (presumed nonexistent) UUID for parent categoryId
  const fakeParentCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid child category creation payload
  const payload: IAimallBackendCategory.ICreate = {
    name: "Test Subcategory - invalid parent",
    depth: 2, // valid subcategory depth
    // Do not include parent_id; it is handled by path param
  };

  // 3. Attempt to create child category and expect an error response
  await TestValidator.error(
    "child category creation should fail with nonexistent parent",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.childCategories.create(
      connection,
      {
        categoryId: fakeParentCategoryId,
        body: payload,
      },
    );
  });
}
