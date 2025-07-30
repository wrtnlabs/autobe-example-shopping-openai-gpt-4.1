import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate successful deletion of a self-owned snapshot from a customer review.
 *
 * This test ensures that a registered customer can create a review, add a
 * snapshot to that review, and then successfully delete that specific snapshot
 * via the DELETE endpoint. The test also verifies that after deletion, the
 * snapshot cannot be found—this covers both standard happy path and
 * post-condition verification for entity removal.
 *
 * Steps:
 *
 * 1. Register a customer using the POST /aimall-backend/customers endpoint.
 * 2. Using the registered customer, create a new review (POST
 *    /aimall-backend/customer/reviews).
 * 3. For the created review, add a snapshot (POST
 *    /aimall-backend/customer/reviews/{reviewId}/snapshots).
 * 4. Delete the snapshot using DELETE
 *    /aimall-backend/customer/reviews/{reviewId}/snapshots/{snapshotId}.
 * 5. Try to fetch or access the snapshot and confirm it is deleted (i.e., handle
 *    404 or not found behavior, or absence in review details if possible).
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_delete_review_snapshot_success_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone =
    "010" +
    typia
      .random<string>()
      .slice(0, 8)
      .replace(/[^0-9]/g, "");
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        status: "active",
        password_hash: "hashedpassword123",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Excellent Product",
        body: "I liked it very much!",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Add a snapshot to the review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: "https://test.cdn/" + typia.random<string>(),
          caption: "My snapshot",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 4. Delete the snapshot
  await api.functional.aimall_backend.customer.reviews.snapshots.erase(
    connection,
    {
      reviewId: review.id,
      snapshotId: snapshot.id,
    },
  );

  // 5. Attempt to delete again to confirm non-existence, should throw
  await TestValidator.error("snapshot should be deleted")(() =>
    api.functional.aimall_backend.customer.reviews.snapshots.erase(connection, {
      reviewId: review.id,
      snapshotId: snapshot.id,
    }),
  );
}
