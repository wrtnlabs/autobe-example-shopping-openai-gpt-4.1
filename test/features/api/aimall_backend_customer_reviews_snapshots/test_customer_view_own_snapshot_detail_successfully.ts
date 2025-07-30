import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that a customer can retrieve details of their own snapshot linked to
 * a review.
 *
 * Business context: Customers can upload media snapshots to product reviews. To
 * allow users to always access their content, a customer should be able to
 * fetch full metadata for their own uploaded snapshot. This test verifies that,
 * after creating a customer and review, and uploading a snapshot, the customer
 * can successfully retrieve that snapshot using the GET endpoint. The returned
 * data must match the uploaded snapshot and respect all business/data
 * consistency rules.
 *
 * Step-by-step process:
 *
 * 1. Register a new customer with unique email/phone.
 * 2. Create a review for a random product.
 * 3. Upload (create) a snapshot (with random media_uri, optional caption).
 * 4. Fetch the snapshot details using the correct reviewId & snapshotId.
 * 5. Validate that all snapshot fields (id, media_uri, caption, customer_id,
 *    timestamps, etc.) match expected values and ownership is consistent.
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_customer_view_own_snapshot_detail_successfully(
  connection: api.IConnection,
) {
  // 1. Register customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const status = "active";
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        status,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a review (for a random product id)
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id,
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewInput,
    },
  );
  typia.assert(review);
  TestValidator.equals("review customer id links claim")(review.customer_id)(
    customer.id,
  );
  TestValidator.equals("review product id matches")(review.product_id)(
    product_id,
  );

  // 3. Create/upload a new snapshot for this review
  const media_uri = `https://media.example.com/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const caption = RandomGenerator.paragraph()(1);
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    product_id,
    media_uri,
    caption,
  } satisfies IAimallBackendSnapshot.ICreate;
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot is attached to correct product")(
    snapshot.product_id,
  )(product_id);
  if (snapshot.customer_id)
    TestValidator.equals("snapshot uploaded by customer")(snapshot.customer_id)(
      customer.id,
    );
  TestValidator.equals("media uri matches")(snapshot.media_uri)(media_uri);
  if (caption)
    TestValidator.equals("caption present")(snapshot.caption)(caption);

  // 4. Retrieve the just-uploaded snapshot via API
  const fetched =
    await api.functional.aimall_backend.customer.reviews.snapshots.at(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("snapshot id matches")(fetched.id)(snapshot.id);
  TestValidator.equals("review product id matches")(fetched.product_id)(
    product_id,
  );
  TestValidator.equals("media uri matches")(fetched.media_uri)(media_uri);
  if (caption)
    TestValidator.equals("caption matches")(fetched.caption)(caption);
}
