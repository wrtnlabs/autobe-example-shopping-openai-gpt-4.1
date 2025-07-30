import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate administrator error handling for deleting a nonexistent review.
 *
 * When an administrator attempts to soft-delete a product review by a reviewId
 * that does not exist in the system, the API should respond with an appropriate
 * "not found" error. No unrelated resources should be affected by this
 * operation, ensuring the integrity of destructive admin actions. This test
 * verifies the system's robustness against invalid destructive operations by
 * privileged users.
 *
 * Steps:
 *
 * 1. Generate a random UUID for a reviewId that is effectively guaranteed not to
 *    exist (i.e., not previously created in any test data).
 * 2. Attempt to call the soft-delete endpoint with this nonexistent reviewId.
 * 3. Validate that the endpoint responds with an error, confirming that the system
 *    properly blocks unqualified destructive operations and returns the
 *    expected error behavior for not found reviews.
 * 4. (Optional for future expansion): Optionally verify unrelated entities are
 *    unaffected. This is not implemented here due to the lack of resource
 *    enumeration capabilities in current API surface.
 */
export async function test_api_aimall_backend_administrator_reviews_test_soft_delete_review_admin_nonexistent_review_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random reviewId UUID not present in the system
  const nonexistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to call the admin soft-delete review endpoint for this ID
  // 3. Validate proper error handling (should throw an error for not found)
  await TestValidator.error("nonexistent reviewId should trigger not found")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.erase(
        connection,
        {
          reviewId: nonexistentReviewId,
        },
      );
    },
  );
}
