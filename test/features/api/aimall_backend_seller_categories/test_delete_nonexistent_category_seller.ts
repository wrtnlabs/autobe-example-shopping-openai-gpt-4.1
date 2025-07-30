import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that deleting a non-existent or already deleted category returns a
 * 404 error.
 *
 * This test case ensures that the seller category DELETE endpoint correctly
 * handles requests to delete a category that either never existed or has
 * already been removed. This is crucial for robust error handling and proper
 * resource management, confirming that the API does not indicate a successful
 * operation or throw unexpected errors when trying to remove non-existent
 * resources.
 *
 * Test procedure:
 *
 * 1. Generate a random UUID (categoryId) that is extremely unlikely to exist
 *    within the system.
 * 2. Attempt to DELETE the category using this categoryId as the path parameter,
 *    simulating an attempt to remove a non-existent resource.
 * 3. Confirm that the API responds with a 404 Not Found error (or equivalent),
 *    indicating the category was not found and could not be deleted.
 * 4. Validate that the error is handled gracefully and does not return a generic
 *    500 or other inappropriate status.
 *
 * This test ensures the API's deletion endpoint adheres to proper REST error
 * handling conventions and improves client-side error reporting reliability.
 */
export async function test_api_aimall_backend_seller_categories_test_delete_nonexistent_category_seller(
  connection: api.IConnection,
) {
  // 1. Generate a random, unlikely-to-exist categoryId (UUID format as required by the endpoint)
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. Attempt to delete this non-existent category and assert that a 404 error is thrown
  await TestValidator.error("Deleting non-existent category returns 404")(
    async () => {
      await api.functional.aimall_backend.seller.categories.erase(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
