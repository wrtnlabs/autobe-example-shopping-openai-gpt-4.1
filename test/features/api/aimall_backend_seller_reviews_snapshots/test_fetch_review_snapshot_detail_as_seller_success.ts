import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate successful retrieval of a review snapshot detail as a seller.
 *
 * This test ensures the following business flow:
 *
 * 1. A review is created by a customer for an existing product (simulate as
 *    customer via review creation API).
 * 2. A snapshot is attached to this review (simulate snapshot creation as a
 *    seller).
 * 3. As the privileged seller (RBAC), request the detail of the snapshot via the
 *    seller snapshot detail API.
 * 4. Verify that returned snapshot data matches expectations (matched IDs, correct
 *    media_uri, optional fields), and that the operation succeeds for
 *    privileged (seller) roles.
 *
 * Preconditions:
 *
 * - Review entity and associated snapshot must exist.
 * - Appropriate authentication context must be present (seller-level privilege).
 *
 * Steps:
 *
 * 1. Create a review for a product as a customer.
 * 2. Attach a snapshot to the review as seller.
 * 3. Retrieve the snapshot via seller API.
 * 4. Validate that RBAC requirements and expected field values are satisfied.
 */
export async function test_api_aimall_backend_seller_reviews_snapshots_test_fetch_review_snapshot_detail_as_seller_success(
  connection: api.IConnection,
) {
  // 1. Create a review for a product as a customer
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Fast delivery, as promised!",
    body: "Product arrived in perfect condition. Highly recommend!",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewInput,
    },
  );
  typia.assert(review);

  // 2. Attach a snapshot to the review as seller
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    product_id: review.product_id,
    media_uri: "https://cdn.example.com/snapshot/test-image.jpg",
    caption: "Proof of packaging for customer review.",
  };
  const snapshot =
    await api.functional.aimall_backend.seller.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 3. Retrieve the snapshot via seller API
  const detail =
    await api.functional.aimall_backend.seller.reviews.snapshots.at(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(detail);

  // 4. Validate that key fields from creation step match detail fetch results
  TestValidator.equals("snapshot id")(detail.id)(snapshot.id);
  TestValidator.equals("review linkage")(detail.product_id)(
    snapshot.product_id,
  );
  TestValidator.equals("media_uri")(detail.media_uri)(snapshot.media_uri);
  TestValidator.equals("caption")(detail.caption)(snapshot.caption);
}
