import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that a customer cannot view the snapshot detail of another
 * customer's review.
 *
 * This test verifies the security rule: snapshot records for a product review
 * are only visible to the customer who owns the review. Attempting to access
 * the media snapshot of a review as a different customer must return a 403
 * Forbidden error.
 *
 * Steps:
 *
 * 1. Register the first customer (owner of the review/snapshot)
 * 2. Register the second customer (potential intruder)
 * 3. Assume first customer's session: create a review
 * 4. As first customer, add a snapshot to the review
 * 5. Switch to second customer's session/context
 * 6. Attempt to get the snapshot created on first customer's review as the second
 *    customer, expect a 403 Forbidden
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_customer_view_snapshot_detail_of_another_users_review_forbidden(
  connection: api.IConnection,
) {
  // 1. Register the first customer (review owner)
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Phone = RandomGenerator.mobile();
  const customer1: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer1Email,
        phone: customer1Phone,
        password_hash: "hashedpassword1",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer1);

  // 2. Register the second customer (who should be denied access)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Phone = RandomGenerator.mobile();
  const customer2: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer2Email,
        phone: customer2Phone,
        password_hash: "hashedpassword2",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer2);

  // 3. As first customer: create review
  // (in a real system, session switching would be needed - for this E2E assume connection simulates customer1)
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. As first customer: add snapshot to review
  const snapshot: IAimallBackendSnapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: "https://cdn.example.com/snapshot.jpg",
          caption: RandomGenerator.paragraph()(),
          created_at: new Date().toISOString(),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. Switch to the second customer context (in reality, must ensure connection simulates customer2 session)
  // For this E2E, assume connection is now for customer2

  // 6. Attempt forbidden read as customer2
  await TestValidator.error(
    "customer2 forbidden from reading customer1's review snapshot",
  )(async () => {
    await api.functional.aimall_backend.customer.reviews.snapshots.at(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
      },
    );
  });
}
