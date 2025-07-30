import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate administrator's ability to delete a review snapshot.
 *
 * This test verifies that:
 *
 * 1. An administrator can delete an existing snapshot of a specific review.
 * 2. Once a snapshot is deleted, it is no longer accessible by identifier (if GET
 *    endpoint existed).
 * 3. All dependencies and policies related to review and snapshot lifecycle are
 *    respected.
 *
 * Test Steps:
 *
 * 1. Create a review as a customer (to obtain a valid reviewId).
 * 2. Upload a snapshot for the review (with administrator authority).
 * 3. Delete the snapshot using the administrator endpoint.
 * 4. Assert deletion success (no content), and logically, confirm the snapshot is
 *    no longer accessible (cannot actually GET since endpoint is not
 *    provided).
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_delete_review_snapshot_success_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a product review as a customer (prerequisite for snapshot)
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "E2E Deletion Test Review",
    body: "This review is for testing admin snapshot deletion.",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 2. Upload a snapshot for that review as admin
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    product_id: review.product_id,
    media_uri: "https://dummy-img.com/snapshot-e2e-test-delete.jpg",
    caption: "Snapshot for deletion e2e test",
  };
  const snapshot =
    await api.functional.aimall_backend.administrator.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 3. Delete the snapshot (admin endpoint)
  await api.functional.aimall_backend.administrator.reviews.snapshots.erase(
    connection,
    {
      reviewId: review.id,
      snapshotId: snapshot.id,
    },
  );
  // No content is the expected outcome (204)

  // 4. (Logical step) Snapshot should be inaccessible: GET endpoint is not present in provided materials, so cannot validate
}
