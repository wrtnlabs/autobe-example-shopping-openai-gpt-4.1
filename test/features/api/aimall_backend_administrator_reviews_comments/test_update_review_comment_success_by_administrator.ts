import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that an administrator can successfully update any review comment
 * regardless of original author, and audit fields reflect the update.
 *
 * Business context:
 *
 * - Platform administrators may need to edit (moderate, fix typos, or redact
 *   private info in) comments submitted on reviews by customers or
 *   sellers–regardless of original author.
 * - This ability is restricted to admin users with global comment privileges,
 *   verified by creating a new admin account for testing.
 *
 * Step-by-step process:
 *
 * 1. Create a full administrator user account (with permission_id, unique
 *    email/name/status).
 * 2. Create a product (assign valid category_id and seller_id).
 * 3. Create a review for the product (using a customer_id–use fictitious id since
 *    we lack customer creation endpoint here).
 * 4. Create a comment on the review as the customer (again, author context
 *    presumed from API–no explicit login in e2e scope).
 * 5. Execute the admin comment update endpoint. Change comment body and privacy
 *    flag (is_private), and capture before/after audit fields (updated_at).
 * 6. Confirm the response's fields reflect the update (body and is_private
 *    values), and that the updated_at timestamp has changed.
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_update_review_comment_success_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account with global comment permissions
  const adminInput: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>(),
    name: RandomGenerator.name(),
    status: "active",
  };
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: adminInput },
    );
  typia.assert(admin);

  // 2. Create a product (for a fictitious seller)
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.paragraph()(),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create a review for the product (author context handled by API; we use random/fake customer_id implied by backend)
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 4. Create a comment on the review as a customer
  const commentInput: IAimallBackendComment.ICreate = {
    review_id: review.id,
    body: "Original comment body.",
    is_private: false,
  };
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: commentInput,
      },
    );
  typia.assert(comment);

  // 5. Save the original audit info (updated_at) for comparison
  const original_updated_at = comment.updated_at;

  // 6. Update the comment as administrator - change body and is_private
  const updateInput: IAimallBackendComment.IUpdate = {
    body: "This comment has been updated by the admin.",
    is_private: true,
  };
  const updatedComment =
    await api.functional.aimall_backend.administrator.reviews.comments.update(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedComment);

  // 7. Assert that the update succeeded: body/is_private reflect update, updated_at has changed
  TestValidator.equals("comment body updated")(updatedComment.body)(
    updateInput.body,
  );
  TestValidator.equals("comment privacy changed")(updatedComment.is_private)(
    updateInput.is_private,
  );
  TestValidator.notEquals("updated_at field should be updated")(
    updatedComment.updated_at,
  )(original_updated_at);
}
