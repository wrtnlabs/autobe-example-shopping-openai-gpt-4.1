import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * E2E test to validate administrator access to full review comment details.
 *
 * This test ensures that a platform administrator can successfully retrieve any
 * specific comment on a product review for the purposes of moderation, dispute
 * resolution, or compliance audits. It verifies that all necessary comment
 * fields (body, privacy, timestamps, author, relationships) are returned as
 * expected. The workflow covers all setup and retrieval logic.
 *
 * Steps:
 *
 * 1. As a customer, create a new product review (platform requires reviews exist
 *    before comments).
 * 2. As the same customer, submit a new comment on the just-created review.
 * 3. As an administrator, fetch the details of this comment using administrator
 *    privileges.
 * 4. Assert that all fields of the comment are returned and valid, especially
 *    body, is_private, timestamps, customer_id, review_id, parent_id, and soft
 *    delete fields.
 * 5. The test passes if the returned comment matches the properties set during
 *    creation, and type assertions pass.
 */
export async function test_api_aimall_backend_administrator_reviews_comments_at(
  connection: api.IConnection,
) {
  // 1. Create a new product review as a customer
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test Review Title",
        body: "Test review body content for E2E.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Create a comment on the review as a customer
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "Administrator should see this comment.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. As administrator, fetch the comment (simulate admin privileges)
  const commentDetail =
    await api.functional.aimall_backend.administrator.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
      },
    );
  typia.assert(commentDetail);

  // 4. Validate all expected fields are present and correct
  TestValidator.equals("id matches")(commentDetail.id)(comment.id);
  TestValidator.equals("review_id matches")(commentDetail.review_id)(review.id);
  TestValidator.equals("body matches")(commentDetail.body)(
    "Administrator should see this comment.",
  );
  TestValidator.equals("is_private matches")(commentDetail.is_private)(false);
  TestValidator.equals("customer_id matches")(commentDetail.customer_id)(
    comment.customer_id,
  );
  TestValidator.equals("parent_id should match")(comment.parent_id)(
    comment.parent_id,
  );
  TestValidator.predicate("created_at valid ISO string")(
    !!Date.parse(commentDetail.created_at),
  );
  TestValidator.predicate("updated_at valid ISO string")(
    !!Date.parse(commentDetail.updated_at),
  );
  TestValidator.equals("deleted_at is null or undefined")(
    commentDetail.deleted_at,
  )(null);
}
