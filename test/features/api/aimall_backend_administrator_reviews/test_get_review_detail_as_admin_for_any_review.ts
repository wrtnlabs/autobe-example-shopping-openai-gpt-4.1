import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Verify administrators can retrieve the complete details of any product
 * review, regardless of the author.
 *
 * This test ensures that when a review is created by a customer, an
 * administrator can fetch its full details using the admin endpoint, bypassing
 * per-user access restrictions. All atomic fields, including IDs, content,
 * ratings, and timestamps, are validated for presence and correctness.
 *
 * Steps:
 *
 * 1. Create a product review as a customer (simulating the existence of a review
 *    in the system).
 * 2. As an administrator, fetch that review's details using its reviewId.
 * 3. Verify all fields (customer_id, product_id, title, body, rating, timestamps,
 *    deleted_at) are present, correctly populated, and admin has unrestricted
 *    access.
 */
export async function test_api_aimall_backend_administrator_reviews_test_get_review_detail_as_admin_for_any_review(
  connection: api.IConnection,
) {
  // 1. Create a review as a customer for test setup
  const reviewCreate =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test review visible to admin",
        body: "This review checks admin can view all reviews regardless of customer.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(reviewCreate);

  // 2. As an administrator, fetch the review by its reviewId
  const adminFetched =
    await api.functional.aimall_backend.administrator.reviews.at(connection, {
      reviewId: reviewCreate.id,
    });
  typia.assert(adminFetched);

  // 3. Validate all atomic fields and unrestricted access
  TestValidator.equals("review id matches")(adminFetched.id)(reviewCreate.id);
  TestValidator.equals("customer id matches")(adminFetched.customer_id)(
    reviewCreate.customer_id,
  );
  TestValidator.equals("product id matches")(adminFetched.product_id)(
    reviewCreate.product_id,
  );
  TestValidator.equals("title matches")(adminFetched.title)(reviewCreate.title);
  TestValidator.equals("body matches")(adminFetched.body)(reviewCreate.body);
  TestValidator.equals("rating matches")(adminFetched.rating)(
    reviewCreate.rating,
  );
  TestValidator.equals("created_at exists")(typeof adminFetched.created_at)(
    "string",
  );
  TestValidator.equals("updated_at exists")(typeof adminFetched.updated_at)(
    "string",
  );
  TestValidator.equals("review should not be soft-deleted")(
    adminFetched.deleted_at == null,
  )(true);
}
