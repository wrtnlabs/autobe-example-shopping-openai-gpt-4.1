import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that role-based access control is enforced when deleting a review
 * snapshot via administrator-only endpoint.
 *
 * This test simulates a standard customer (non-admin) creating a review and
 * uploading a snapshot, then attempts to delete the snapshot using an
 * admin-only endpoint. The expectation: the operation should fail (e.g., 403
 * forbidden), demonstrating proper permission enforcement. Non-admins must not
 * be allowed to delete via admin API.
 *
 * Steps:
 *
 * 1. As a customer, create a review (submit product_id, title, body, rating)
 * 2. As a customer, upload a snapshot to the review (supplying at least media_uri)
 * 3. Without admin credentials, attempt to delete the uploaded snapshot with the
 *    admin snapshot delete endpoint
 * 4. Confirm that forbidden error (403 or similar) is thrown
 */
export async function test_api_aimall_backend_test_delete_review_snapshot_without_permission(
  connection: api.IConnection,
) {
  // 1. As customer, create a review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test Review Title",
        body: "Test review body content.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. As customer, upload a snapshot to this review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: "https://test-image-url/image.jpg",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. Attempt to delete the snapshot using admin-only endpoint as customer (should fail)
  await TestValidator.error("Non-admin cannot delete review snapshot")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.snapshots.erase(
        connection,
        {
          reviewId: review.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
