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
 * Validate that a seller cannot delete a review snapshot for a product that
 * does not belong to them.
 *
 * This test ensures business rules: Only the owner of a product can delete
 * review snapshots for reviews related to their product.
 *
 * Workflow:
 *
 * 1. Register seller A (product owner)
 * 2. Register seller B (not owner)
 * 3. Seller A creates product A
 * 4. Seller B creates product B
 * 5. Register a customer
 * 6. Customer reviews product A
 * 7. Customer adds a snapshot to the review
 * 8. Seller B attempts to delete the snapshot for review of product A using the
 *    DELETE endpoint
 * 9. Validate that permission is denied (error is thrown). Seller B cannot delete
 *    snapshots for reviews on products they don't own.
 */
export async function test_api_aimall_backend_test_seller_delete_review_snapshot_fail_for_others_product(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: RandomGenerator.alphaNumeric(8) + "@seller.com",
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Register seller B
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: RandomGenerator.alphaNumeric(8) + "@seller.com",
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Seller A creates product A
  const productA =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: sellerA.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        },
      },
    );
  typia.assert(productA);

  // 4. Seller B creates product B
  const productB =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: sellerB.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        },
      },
    );
  typia.assert(productB);

  // 5. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@customer.com",
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 6. Customer reviews product A
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productA.id,
        title: RandomGenerator.alphaNumeric(10),
        body: RandomGenerator.paragraph()(),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 7. Customer adds a snapshot for review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          product_id: productA.id,
          customer_id: customer.id,
          media_uri:
            "https://cdn.example.com/media/" +
            RandomGenerator.alphaNumeric(8) +
            ".jpg",
          caption: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(snapshot);

  // 8. Seller B attempts to delete snapshot for product A's review.
  await TestValidator.error(
    "Seller B cannot delete a review snapshot for another seller's product",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.snapshots.erase(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
      },
    );
  });
}
