import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test soft deleting a review comment as administrator when the comment has
 * already been soft deleted.
 *
 * This test validates that the administrator's soft delete API for review
 * comments enforces idempotency and the correct state transition: if a comment
 * is already soft deleted (its deleted_at is already set), a second soft delete
 * attempt should return an error.
 *
 * Step-by-step process:
 *
 * 1. Register an administrator (simulate admin privileges for API calls).
 * 2. Create a product (seller context is simulated; product is used as context for
 *    the review).
 * 3. Create a customer review associated with the product (customer context is
 *    simulated).
 * 4. Create a comment on that review as a customer.
 * 5. Soft delete the comment as administrator (sets deleted_at).
 * 6. Attempt to soft delete again as administrator. Expect an error confirming
 *    that repeated soft deletion is forbidden.
 *
 * This test confirms proper state machine enforcement for comment deletion and
 * ensures compliance with audit & compliance requirements for logical data
 * deletion.
 */
export async function test_api_administrator_test_soft_delete_review_comment_fail_on_already_deleted_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an administrator
  const admin: IAimallBackendAdministrator =
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

  // 2. Create a product (assume seller exists & authenticated or simulate as needed)
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create a review for that product (as customer; authentication simulated)
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. Create a comment on this review
  const comment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: RandomGenerator.paragraph()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Soft delete the comment as administrator
  await api.functional.aimall_backend.administrator.reviews.comments.erase(
    connection,
    {
      reviewId: review.id,
      commentId: comment.id,
    },
  );

  // 6. Attempt to soft delete again; should fail
  await TestValidator.error(
    "Second soft delete should fail for already deleted comment",
  )(() =>
    api.functional.aimall_backend.administrator.reviews.comments.erase(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
      },
    ),
  );
}
