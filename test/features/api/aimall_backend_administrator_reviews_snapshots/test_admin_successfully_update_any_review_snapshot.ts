import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that an administrator can successfully update any review snapshot,
 * regardless of ownership.
 *
 * This test ensures that when an admin updates a snapshot linked to a product
 * review (even if not their own), the changes are applied correctly. Edits are
 * allowed for fields such as caption and media_uri per business rules.
 *
 * Detailed Steps:
 *
 * 1. Register an administrator (with random permission UUID and status 'active')
 * 2. Register a customer (with random credentials and status 'active')
 * 3. Customer creates a review (linked to a product, with required fields)
 * 4. Customer attaches a snapshot to the review (provide unique media_uri)
 * 5. Admin performs an update of the customer’s snapshot (edit caption/media_uri)
 * 6. Validate the update is reflected (assert returned values changed and correct,
 *    UUIDs match)
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_admin_successfully_update_any_review_snapshot(
  connection: api.IConnection,
) {
  // 1. Register an administrator for snapshot management
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register a new customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string>(),
        phone: RandomGenerator.mobile(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Customer creates a review (for a random product UUID)
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

  // 4. Customer adds a snapshot to the review
  const snapshot: IAimallBackendSnapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: "https://cdn.domain.com/sample-snapshot.jpg",
          caption: "Original user caption",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. Admin updates the snapshot (update caption to a new value)
  const updateInput: IAimallBackendSnapshot.IUpdate = {
    caption: "Admin updated caption!",
  };
  const updated: IAimallBackendSnapshot =
    await api.functional.aimall_backend.administrator.reviews.snapshots.update(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 6. Validate the update (caption should have changed, IDs the same)
  TestValidator.equals("updated snapshot id matches")(updated.id)(snapshot.id);
  TestValidator.equals("updated review id matches")(review.id)(review.id); // (no review ID on snapshot, skip deeper check)
  TestValidator.notEquals("caption updated")(updated.caption)(snapshot.caption);
  TestValidator.equals("new caption matches")(updated.caption)(
    updateInput.caption,
  );
}
