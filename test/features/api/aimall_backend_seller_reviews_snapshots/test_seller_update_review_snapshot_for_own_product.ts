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
 * Validate seller ability to update snapshot metadata for a review on their own
 * product.
 *
 * This test verifies that a seller, as the owner of a product, can update the
 * metadata of a snapshot (e.g., caption) attached to a review written for their
 * product by a customer. The workflow ensures proper entity relationships and
 * permissions.
 *
 * Steps:
 *
 * 1. Register a seller (who will own a product)
 * 2. Register a product under the seller
 * 3. Register a customer who will write a review
 * 4. Customer posts a review for the product
 * 5. Customer adds a snapshot to the review
 * 6. Seller updates the snapshot metadata (caption)
 * 7. Validate that the update is applied (caption is changed as expected)
 */
export async function test_api_aimall_backend_seller_update_review_snapshot_for_own_product(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register product under this seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
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
        title: "Review Title",
        body: "Initial review body content.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 5. Customer adds a snapshot to the review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          product_id: product.id,
          customer_id: customer.id,
          media_uri: "https://example.com/image1.jpg",
          caption: "Original caption",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 6. Seller updates the snapshot's caption metadata
  const updatedCaption = "Updated by seller";
  const updatedSnapshot =
    await api.functional.aimall_backend.seller.reviews.snapshots.update(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
        body: {
          caption: updatedCaption,
        } satisfies IAimallBackendSnapshot.IUpdate,
      },
    );
  typia.assert(updatedSnapshot);

  // 7. Validate the update was applied
  TestValidator.equals("caption is updated by seller")(updatedSnapshot.caption)(
    updatedCaption,
  );
}
