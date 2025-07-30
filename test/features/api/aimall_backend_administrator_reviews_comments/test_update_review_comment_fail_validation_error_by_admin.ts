import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test error validation for administrator update of a review comment with
 * invalid data.
 *
 * This test ensures that when an administrator attempts to update an existing
 * review comment with invalid input—such as an empty body string—the system
 * enforces schema validation and rejects the request with an error. This guards
 * against API schema violations and protects data integrity for controlled
 * comment editing workflows.
 *
 * Step-by-step process:
 *
 * 1. Register a new administrator account (so admin token can be used below).
 * 2. Register a product to provide product context for a review.
 * 3. Register a review for the product (using required fields only).
 * 4. Register a comment on the review (so that a modifiable comment exists).
 * 5. As an administrator, attempt to update the comment but submit invalid input
 *    data such as `{ body: "" }`.
 * 6. Confirm that the request is rejected and throws an error (schema/data
 *    validation failure), verifying the input validation enforcement for this
 *    endpoint.
 *
 * Note: Because TypeScript DTO typing prevents attempting to submit a
 * non-boolean for `is_private`, only runtime-reachable invalid but
 * type-conformant cases are tested.
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_update_review_comment_fail_validation_error_by_admin(
  connection: api.IConnection,
) {
  // 1. Provision administrator account
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: typia.random<string>(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Register a product (admin registers on behalf of seller: random seller/category)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "E2E Test Product",
        description: "For admin comment update schema error test.",
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. Register a review for this product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: "E2E Test Review",
        body: "Review for invalid comment update e2e test.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 4. Register a comment to this review (customer role assumed for this)
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Initial valid comment.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // 5. As admin, attempt to update the comment with invalid input (empty body)
  await TestValidator.error("Update with empty body should fail validation")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.comments.update(
        connection,
        {
          reviewId: review.id,
          commentId: comment.id,
          body: {
            body: "",
          },
        },
      );
    },
  );

  // TypeScript typing prevents non-boolean for is_private, so we do not implement that case.
}
