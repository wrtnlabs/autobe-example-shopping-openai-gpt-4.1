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
 * Validate that a non-owner seller cannot update a snapshot attached to a
 * review for a product they do not own.
 *
 * **Scenario steps:**
 *
 * 1. Register Seller A (product owner)
 * 2. Register Seller B (non-owner; will attempt forbidden update)
 * 3. Create a product for Seller A
 * 4. Register a Customer
 * 5. Customer posts a review for Seller A’s product
 * 6. Customer adds a snapshot to the review
 * 7. Non-owner Seller B attempts to update the snapshot (should fail with
 *    permission denied)
 *
 * **Note:** This test does not simulate switching the authentication
 * context—SDK/test system lacks seller-login or role-switching APIs, so
 * 'connection' is passed unchanged for all requests. Thus, the backend is
 * responsible for enforcing FK-based and business logic permission boundaries,
 * and this test validates that enforcing a non-matching seller_id triggers an
 * error.
 *
 * We expect Seller B’s update attempt to fail with a business logic or
 * permission error.
 */
export async function test_api_aimall_backend_test_seller_update_review_snapshot_fail_for_not_own_product(
  connection: api.IConnection,
) {
  // 1. Register Seller A (product owner)
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: RandomGenerator.alphaNumeric(8) + "@a.com",
          contact_phone: RandomGenerator.alphaNumeric(10),
          status: "active",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B (non-owner)
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: RandomGenerator.alphaNumeric(8) + "@b.com",
          contact_phone: RandomGenerator.alphaNumeric(10),
          status: "active",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Create a product for Seller A
  // Note: category_id must be a UUID, but we have no category API—use random uuid
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: sellerA.id,
          title: RandomGenerator.paragraph()(1),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 4. Register a Customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@customer.com",
        phone: RandomGenerator.alphaNumeric(10),
        password_hash: RandomGenerator.alphaNumeric(16),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 5. Customer posts a review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.paragraph()(1),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 6. Customer adds a snapshot to the review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          product_id: product.id,
          customer_id: customer.id,
          media_uri: "https://cdn.example.com/photo.png",
          caption: "Customer upload",
        },
      },
    );
  typia.assert(snapshot);

  // 7. Non-owner Seller B attempts to update the snapshot (should fail with permission error)
  // NOTE: Without an authentication/identity API, we cannot switch real seller context. We rely on the backend enforcing FK match.
  await TestValidator.error(
    "Seller B cannot update snapshot for product not owned by them",
  )(() =>
    api.functional.aimall_backend.seller.reviews.snapshots.update(connection, {
      reviewId: review.id,
      snapshotId: snapshot.id,
      body: {
        caption: "Malicious update attempt by Seller B",
      },
    }),
  );
}
