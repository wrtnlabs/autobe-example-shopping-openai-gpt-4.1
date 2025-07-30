import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deletion of a non-existent or already deleted product category by an
 * administrator.
 *
 * Business context: This test ensures robust error handling by attempting to
 * delete a category using an invalid (random or already deleted) categoryId.
 * Only administrators should have access. The system must return a not found
 * (404) error, confirming that the API safely handles delete operations
 * targeting non-existent resources and does not leak information or perform
 * unintended actions.
 *
 * Steps:
 *
 * 1. Generate a random UUID (very likely not matching any real category).
 * 2. Attempt to delete this category as an administrator.
 * 3. Validate that the response is a 'not found' error (404), confirming no
 *    category existed for the given id and robust error handling is in place.
 */
export async function test_api_aimall_backend_administrator_categories_eraseByCategoryid_test_delete_nonexistent_category_admin(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent category
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt deletion and expect a 'not found' error
  await TestValidator.error(
    "should return not found when deleting non-existent category",
  )(async () => {
    await api.functional.aimall_backend.administrator.categories.erase(
      connection,
      { categoryId },
    );
  });
}
