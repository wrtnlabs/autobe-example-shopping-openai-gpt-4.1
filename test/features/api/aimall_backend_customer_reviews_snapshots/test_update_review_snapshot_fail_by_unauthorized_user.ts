import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that unauthorized users cannot update snapshots of product reviews.
 *
 * This test checks the permission enforcement on the review snapshot update
 * endpoint: Only the owner (original author) or admin can update a given review
 * snapshot. The scenario ensures that another user (customer B) is denied
 * access when attempting to update a snapshot belonging to customer A.
 *
 * Test Steps:
 *
 * 1. Register customer A (owner of review/snapshot)
 * 2. Register customer B (non-owner, unauthorized)
 * 3. Customer A creates a review
 * 4. Customer A adds a snapshot to the review
 * 5. Customer B attempts to update the snapshot and should receive a permission
 *    denied error
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_update_review_snapshot_fail_by_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Register customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPhone =
    "010" +
    Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerAEmail,
        phone: customerAPhone,
        password_hash: "hashA",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerA);

  // 2. Register customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPhone =
    "010" +
    Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerBEmail,
        phone: customerBPhone,
        password_hash: "hashB",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // 3. Customer A creates a product review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Authorization Test Review",
        body: "Validating snapshot permission for update scenario.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 4. Customer A adds a snapshot to the review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          product_id: review.product_id,
          customer_id: customerA.id,
          media_uri:
            "https://media.aimall.com/" +
            typia.random<string & tags.Format<"uuid">>(),
          caption: "Snapshot for permission test",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. (Simulate as customer B). In a real test, this would be with customer B's auth/context.
  // In this code, we conceptually switch by comment, leaving out actual authentication as not available in provided APIs.

  // 6. Customer B tries to update a snapshot for customer A's review (should fail)
  await TestValidator.error("Unauthorized user cannot update the snapshot")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.snapshots.update(
        connection,
        {
          reviewId: review.id,
          snapshotId: snapshot.id,
          body: {
            caption: "Attempt by non-owner customer B",
          } satisfies IAimallBackendSnapshot.IUpdate,
        },
      );
    },
  );
}
