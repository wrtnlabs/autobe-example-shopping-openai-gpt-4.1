import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Test that the administrator receives a not found error when attempting to
 * update a nonexistent snapshot ID for a review.
 *
 * Business context: Only administrators/operators can access this endpoint to
 * update review snapshots. Updating a snapshot for a review requires both IDs
 * to be valid, and a nonexistent snapshotId should result in 404 Not Found (not
 * any other error).
 *
 * Workflow:
 *
 * 1. Create an administrator to perform the operation.
 * 2. Register a customer, who will own a review.
 * 3. Have the customer create a review, which supplies a valid reviewId.
 * 4. As admin, attempt to update a snapshot for the review with a bogus
 *    snapshotId.
 * 5. Assert that a 404 Not Found error is thrown.
 */
export async function test_api_administrator_test_admin_update_review_snapshot_not_found_error(
  connection: api.IConnection,
) {
  // 1. Create an administrator
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: "E2E Admin",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register a customer (owner of the review)
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Customer creates a review
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test Review",
        body: "This is just a test review.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. Admin attempts to update a snapshot on the review with a bogus snapshotId
  const bogus_snapshot_id: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("Should get 404 Not Found")(async () => {
    await api.functional.aimall_backend.administrator.reviews.snapshots.update(
      connection,
      {
        reviewId: review.id,
        snapshotId: bogus_snapshot_id,
        body: {
          caption: "This should not succeed",
        } satisfies IAimallBackendSnapshot.IUpdate,
      },
    );
  });
}
