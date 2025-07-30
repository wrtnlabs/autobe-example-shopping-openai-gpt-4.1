import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that searching for snapshots on a non-existent review returns a 404
 * error.
 *
 * Business context: Administrators may mistype or query snapshots for a review
 * ID that does not exist. The system must return a 404 Not Found error, not a
 * misleading empty set or generic error, to properly convey absence of target
 * review.
 *
 * Steps:
 *
 * 1. Generate a random reviewId UUID that almost certainly does not exist.
 * 2. Attempt to search snapshots for that reviewId using the PATCH API and minimal
 *    filter.
 * 3. Assert that a 404 Not Found error occurs, confirming correct behavior.
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_admin_search_snapshots_for_nonexistent_review_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random, likely-nonexistent reviewId (UUID)
  const nonExistentReviewId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to search snapshots for this non-existent reviewId (empty filter)
  // 3. Assert that an error (ideally a 404 Not Found) is thrown
  await TestValidator.error(
    "Should throw 404 Not Found when reviewId does not exist",
  )(async () => {
    await api.functional.aimall_backend.administrator.reviews.snapshots.search(
      connection,
      {
        reviewId: nonExistentReviewId,
        body: {},
      },
    );
  });
}
