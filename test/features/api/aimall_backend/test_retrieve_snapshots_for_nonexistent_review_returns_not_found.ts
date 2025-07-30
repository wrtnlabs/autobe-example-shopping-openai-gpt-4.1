import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate error behavior when attempting to retrieve snapshots for a
 * nonexistent review as an administrator.
 *
 * Business context: Administrators should not be able to retrieve
 * media/snapshots for reviews that do not exist. The API must return a 404 Not
 * Found when queried with an invalid or random review UUID.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID that does not correspond to any real review (to
 *    represent a nonexistent reviewId).
 * 2. As an administrator, attempt to call the GET
 *    /aimall-backend/administrator/reviews/{reviewId}/snapshots endpoint with
 *    the nonexistent reviewId.
 * 3. Assert that the API returns a 404 Not Found error, not an empty success
 *    response.
 *
 * Edge case covered:
 *
 * - Ensure the system does not incorrectly treat a missing review as success by
 *   responding with an empty page. It must return a 404 error for the missing
 *   review.
 */
export async function test_api_aimall_backend_test_retrieve_snapshots_for_nonexistent_review_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID to simulate a review that does not exist
  const randomReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt retrieval and assert that a 404 Not Found error is thrown
  await TestValidator.error("404 not found for nonexistent review")(() =>
    api.functional.aimall_backend.administrator.reviews.snapshots.index(
      connection,
      {
        reviewId: randomReviewId,
      },
    ),
  );
}
