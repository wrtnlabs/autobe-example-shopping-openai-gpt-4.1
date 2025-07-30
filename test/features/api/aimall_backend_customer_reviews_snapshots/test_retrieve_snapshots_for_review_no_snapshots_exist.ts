import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate retrieval of snapshots for a review with no snapshots attached.
 *
 * Ensures that the API returns an empty list of snapshots for a review that
 * exists but does not have any snapshots. This test checks that no error is
 * thrown, the response type is correct, and that pagination metadata is also
 * correct if present.
 *
 * Steps:
 *
 * 1. Create a new product review (no snapshots attached).
 * 2. Query the review's snapshots.
 * 3. Assert the snapshot list is empty and validate pagination metadata.
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_index_test_retrieve_snapshots_for_review_no_snapshots_exist(
  connection: api.IConnection,
) {
  // 1. Create a new review with no attached snapshots
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Review for empty-snapshots test",
        body: "This review is created only to test empty snapshot retrieval.",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Retrieve snapshots for this review
  const output =
    await api.functional.aimall_backend.customer.reviews.snapshots.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(output);

  // 3. Assert that the returned data is an empty array (snapshots list)
  TestValidator.equals("should return no snapshots")(output.data ?? [])([]);

  // 4. Optionally, check that pagination exists and is valid
  if (output.pagination) {
    TestValidator.equals("empty snapshot count")(output.pagination.records)(0);
    TestValidator.equals("current page is 1")(output.pagination.current)(1);
  }
}
