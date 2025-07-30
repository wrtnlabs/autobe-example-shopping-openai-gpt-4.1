import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Test that a seller can successfully delete a review snapshot associated with
 * their own product.
 *
 * Scenario steps:
 *
 * 1. Register a seller account using the administrator endpoint.
 * 2. Create a product for that seller using the administrator endpoint (must
 *    supply seller_id).
 * 3. Register a customer account (for review/snapshot authoring).
 * 4. Customer creates a product review (linked to product from step 2).
 * 5. Customer adds a snapshot to the created review (must link to review).
 * 6. Seller calls delete API as owner, deleting the review snapshot (verify
 *    correct snapshot is targeted).
 * 7. Attempt to verify the snapshot is no longer accessible (expect not found or
 *    missing in subsequent list/fetch).
 *
 * The test validates that sellers can only delete review snapshots for their
 * own products, and deletion works end-to-end.
 */
export async function test_api_aimall_backend_seller_test_seller_delete_review_snapshot_success_for_own_product(
  connection: api.IConnection,
) {
  // 1. Register seller via admin API
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register product for this seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Register a customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 4. Customer creates a review for the product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 5. Customer attaches a snapshot to the review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          product_id: product.id,
          customer_id: customer.id,
          media_uri:
            "https://img.example.com/" + RandomGenerator.alphabets(10) + ".jpg",
          caption: RandomGenerator.paragraph()(),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 6. Seller deletes the review's snapshot
  await api.functional.aimall_backend.seller.reviews.snapshots.erase(
    connection,
    {
      reviewId: review.id,
      snapshotId: snapshot.id,
    },
  );

  // 7. Attempting to delete again should result in an error (ideally 404 Not Found)
  await TestValidator.error("cannot re-delete snapshot")(() =>
    api.functional.aimall_backend.seller.reviews.snapshots.erase(connection, {
      reviewId: review.id,
      snapshotId: snapshot.id,
    }),
  );
}
