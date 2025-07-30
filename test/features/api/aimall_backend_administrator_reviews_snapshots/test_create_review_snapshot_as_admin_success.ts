import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that an administrator can create a new snapshot (media/photo) for a
 * product review using the administrative endpoint.
 *
 * This test ensures that:
 *
 * - A valid administrator account exists in the system
 * - A product review exists for an actual product to which the snapshot will be
 *   attached
 * - The snapshot creation (with valid media_uri and optional caption) is
 *   performed by the administrator
 * - The resulting snapshot entity is correctly returned and conforms to schema
 *
 * Step-by-step process:
 *
 * 1. Create an administrator account to act in privileged context
 * 2. Create a customer review (requires simulated valid customer and product
 *    reference)
 * 3. As admin, create a snapshot for that review (supply media_uri, and optionally
 *    a caption and created_at)
 * 4. Assert the snapshot is correctly linked and schema-valid
 * 5. (Audit log validation skipped unless relevant APIs are exposed)
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_create_review_snapshot_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminInput = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IAimallBackendAdministrator.ICreate;
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: adminInput },
    );
  typia.assert(admin);

  // 2. Create product review as customer (simulate required objects)
  const reviewInput = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Great product!",
    body: "Arrived quickly and works as expected.",
    rating: 5,
  } satisfies IAimallBackendReview.ICreate;
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 3. Admin creates snapshot for the review
  const snapshotInput = {
    product_id: review.product_id, // link to product in review
    media_uri: "https://cdn.example.com/image1.jpg",
    caption: "Review evidence - product photo",
    created_at: new Date().toISOString(),
  } satisfies IAimallBackendSnapshot.ICreate;
  const snapshot =
    await api.functional.aimall_backend.administrator.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);

  // 4. Confirm snapshot is correctly linked and fields are valid
  TestValidator.equals("linked product_id")(snapshot.product_id)(
    review.product_id,
  );
  TestValidator.equals("media_uri matches")(snapshot.media_uri)(
    snapshotInput.media_uri,
  );
  if (snapshot.caption)
    TestValidator.equals("caption matches")(snapshot.caption)(
      snapshotInput.caption,
    );
  TestValidator.predicate("created_at valid")(
    !!snapshot.created_at && typeof snapshot.created_at === "string",
  );

  // 5. (Audit log validation skipped unless relevant APIs are exposed)
}
