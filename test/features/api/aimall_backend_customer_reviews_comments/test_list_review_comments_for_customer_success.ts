import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test listing all comments for a customer's product review, ensuring only
 * non-deleted, visible comments are returned, with privacy rules enforced.
 *
 * This scenario verifies that after creating a product review as a customer,
 * you can post multiple comments (at least one public and one private), and
 * subsequently retrieve all comments for that review:
 *
 * 1. Create a product review (as a prerequisite, simulating customer action).
 * 2. Post two comments to this review - one public, one private - using the POST
 *    /comments endpoint for the same reviewId.
 * 3. (Optional step skipped as there's no delete endpoint: cannot mark comments as
 *    deleted with this API set.)
 * 4. Call the GET /comments endpoint for the created reviewId.
 * 5. Validate the returned list: - Includes both comments just posted - Each has
 *    correct privacy flag (is_private) - All summary fields are present: id,
 *    body, customer_id, created_at, is_private - No deleted comments (by API
 *    contract) should appear
 * 6. Confirm that comments' is_private flag aligns with how they were posted, and
 *    that both types are visible to their author (the customer).
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_list_review_comments_for_customer_success(
  connection: api.IConnection,
) {
  // 1. Create a new product review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test review comment list",
        body: "This is a review used to test the comment listing endpoint.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 2. Post a public comment
  const commentPublic =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "This is a public comment.",
          is_private: false,
        },
      },
    );
  typia.assert(commentPublic);

  // 3. Post a private comment
  const commentPrivate =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "This is a private comment.",
          is_private: true,
        },
      },
    );
  typia.assert(commentPrivate);

  // 4. List the comments for the review
  const commentsPage =
    await api.functional.aimall_backend.customer.reviews.comments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(commentsPage);

  // 5. Validate all returned comments: only our two, check summary fields and privacy
  const comments = commentsPage.data ?? [];
  TestValidator.equals("should list two comments")(comments.length)(2);

  // Find each by their bodies
  const foundPublic = comments.find(
    (c) => c.body === "This is a public comment.",
  );
  const foundPrivate = comments.find(
    (c) => c.body === "This is a private comment.",
  );
  TestValidator.predicate("public comment found")(!!foundPublic);
  TestValidator.predicate("private comment found")(!!foundPrivate);

  // Check required fields and privacy flag
  for (const c of comments) {
    TestValidator.predicate("id present")(!!c.id);
    TestValidator.predicate("body present")(
      typeof c.body === "string" && c.body.length > 0,
    );
    TestValidator.predicate("customer_id present")(!!c.customer_id);
    TestValidator.predicate("created_at present")(!!c.created_at);
    TestValidator.predicate("is_private present")(
      typeof c.is_private === "boolean",
    );
  }

  // Public/private flags match original comments
  TestValidator.equals("public comment is public")(foundPublic?.is_private)(
    false,
  );
  TestValidator.equals("private comment is private")(foundPrivate?.is_private)(
    true,
  );
}
