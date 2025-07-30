import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test that the API returns a not found error when querying the child
 * categories under a non-existent parent category.
 *
 * Business context: This simulates an administrator attempting to view the
 * immediate child categories for a parent category UUID that does not exist in
 * the aimall_backend_categories table. The endpoint is required to robustly
 * validate the path parameter and respond correctly if the resource is absent.
 *
 * Workflow:
 *
 * 1. Generate a random UUID that is extremely unlikely to exist as any category id
 *    in the database.
 * 2. Attempt to invoke the child categories list API with this non-existent parent
 *    category id.
 * 3. Expect the API to throw a not found error (HTTP 404), indicating the absence
 *    of the resource.
 * 4. Validate that the error is thrown and that no category data is returned.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_list_child_categories_with_invalid_parent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correspond to any category
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch immediate child categories with a non-existent category id
  await TestValidator.error(
    "should throw not found error for non-existent parent category",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.childCategories.index(
      connection,
      {
        categoryId: nonExistentCategoryId,
      },
    );
  });
}
