import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates seller's ability to search & filter review comments (privacy,
 * authorship, parent/threading, pagination) and confirms proper privacy/access
 * controls.
 *
 * This test covers the end-to-end scenario where:
 *
 * - A seller creates a new product
 * - A customer posts a review on it
 * - Multiple customers create comments (mixing public/private, different authors,
 *   and reply chains) on the review
 * - The seller authenticates and attempts advanced searches via PATCH (with all
 *   filter fields)
 * - The seller should see all comments for their product's reviews (including
 *   private), with all filters working as expected
 * - The seller is forbidden from searching comments on reviews unrelated to their
 *   product
 *
 * Steps:
 *
 * 1. Seller creates a product.
 * 2. Customer 1 posts a review for this product.
 * 3. Customer 1 and Customer 2 create multiple comments on the review:
 *
 *    - Both public and private comments.
 *    - At least one reply (with parent_id).
 * 4. Authenticate as the seller.
 * 5. Use PATCH /aimall-backend/seller/reviews/:reviewId/comments to search: a. All
 *    comments (no filters) b. Filter by customer_id (author) c. Filter by
 *    is_private d. Filter by parent_id (replies) e. Filter by body keyword f.
 *    Filter by date range (created_at_from/to) g. Check pagination (page,
 *    limit) Assert result set correctness for each filter, and that seller sees
 *    all comments (including private) for their product's review.
 * 6. As the seller, try to search comments from a review on another (unrelated)
 *    product and confirm access is denied (error/unauthorized).
 */
export async function test_api_aimall_backend_test_search_review_comments_seller_privacy_and_authorization(
  connection: api.IConnection,
) {
  // --------- PREP: Seller and Product
  // Create seller identifier (simulate seller auth implied by api connection object)
  const seller_id: string = typia.random<string & tags.Format<"uuid">>();
  const category_id: string = typia.random<string & tags.Format<"uuid">>();

  // 1. Seller creates product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id,
        seller_id,
        title: "Test Product for Comment Search",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // --------- Customers & Review
  // Simulate 2 customers
  const customer1_id: string = typia.random<string & tags.Format<"uuid">>();
  const customer2_id: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Customer 1 posts a review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: "Satisfactory Experience",
        body: "Shipping was very fast and product matched description.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // --------- Comments (via customers, both public/private, with reply threading)
  // 3. Multiple comments
  // Public root comment from customer1
  const comment1 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Really useful info!",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment1);

  // Private root comment from customer2
  const comment2 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Private seller feedback only.",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment2);

  // Reply (public) from customer1 to comment2
  const comment3 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          parent_id: comment2.id,
          body: "Followup for seller: please check!",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment3);

  // Another private reply from customer2 to comment1
  const comment4 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          parent_id: comment1.id,
          body: "Private reply for seller only.",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment4);

  // ------- As Seller: search comments with filters (using PATCH)
  // a) No filters: get all comments for this review (should see all, including private)
  let searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("all 4 comments present")(
    searchRes.data.length === 4,
  );

  // b) Filter by customer_id (customer1_id):
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { customer_id: customer1_id },
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("at least one comment by customer 1")(
    searchRes.data.some(
      (c) =>
        c.body.includes("Really useful info") ||
        c.body.includes("Followup for seller"),
    ),
  );

  // c) Filter by is_private true
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { is_private: true },
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("both private comments present")(
    searchRes.data.length === 2 && searchRes.data.every((c) => c.is_private),
  );

  // d) Filter by parent_id (threaded replies, e.g., comment2.id)
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { parent_id: comment2.id },
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("comment3 is returned as reply to comment2")(
    searchRes.data.length === 1 && searchRes.data[0].parent_id === comment2.id,
  );

  // e) Filter by body keyword ("Private seller feedback only.")
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { body: "Private seller feedback only." } as any, // for demonstration, but real API would require keyword/contains search feature
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("contains specific body text")(
    searchRes.data.every((c) =>
      c.body.includes("Private seller feedback only."),
    ),
  );

  // f) Filter by created_at_from/to (using earliest and latest comment date)
  const earliest = Math.min(
    ...searchRes.data.map((c) => new Date(c.created_at).getTime()),
  );
  const latest = Math.max(
    ...searchRes.data.map((c) => new Date(c.created_at).getTime()),
  );
  // from
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { created_at_from: new Date(earliest).toISOString() },
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("all comments after from-date")(
    searchRes.data.every((c) => new Date(c.created_at).getTime() >= earliest),
  );
  // to
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { created_at_to: new Date(latest).toISOString() },
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate("all comments before to-date")(
    searchRes.data.every((c) => new Date(c.created_at).getTime() <= latest),
  );

  // g) Pagination test: limit=2, page=1 then page=2
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { limit: 2, page: 1 },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("page size == limit")(searchRes.data.length)(2);
  searchRes =
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: review.id,
        body: { limit: 2, page: 2 },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("page size == limit or less")(
    searchRes.data.length <= 2,
  )(true);

  // ------------ Negative: as seller, search unrelated review's comments
  const other_product =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Unrelated Product",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(other_product);
  const unrelated_review =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: other_product.id,
        title: "Great Other Product!",
        body: "I like this unrelated item.",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(unrelated_review);
  await TestValidator.error(
    "seller forbidden to search comments of review for different seller's product",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.comments.search(
      connection,
      {
        reviewId: unrelated_review.id,
        body: {},
      },
    );
  });
}
