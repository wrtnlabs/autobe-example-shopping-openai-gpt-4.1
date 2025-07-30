import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validates that an administrator can soft delete any review comment,
 * regardless of authorship.
 *
 * Scenario steps:
 *
 * 1. Register an administrator with a global permission
 * 2. Create a product as a prerequisite for review
 * 3. Create a review for the product as a customer
 * 4. Create a comment (as a customer) for that review
 * 5. Administrator soft deletes the comment
 * 6. Confirm precondition: deleted_at is null prior to delete
 * 7. Postcondition: (Cannot fetch the comment directly to confirm deleted_at, due
 *    to SDK limitation. If a comment query endpoint is added, validate that
 *    deleted_at is set; currently, verify setup and deletion call succeed.)
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_soft_delete_review_comment_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Create a product (category/seller can be any test UUIDs)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(), // <--- FIXED: replaced .sentence() with .paragraph()()
        description: RandomGenerator.alphabets(10),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create a review for the product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(), // <--- FIXED: replaced .sentence() with .paragraph()()
        body: RandomGenerator.paragraph()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 4. Create a comment as customer on the review
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: RandomGenerator.content()()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("no deleted_at before delete")(comment.deleted_at)(null);

  // 5. Administrator soft deletes the comment
  await api.functional.aimall_backend.administrator.reviews.comments.erase(
    connection,
    {
      reviewId: review.id,
      commentId: comment.id,
    },
  );

  // 6. Postcondition validation (SDK limitation: can't fetch updated comment). If fetch or query is added, assert deleted_at is set.
}
