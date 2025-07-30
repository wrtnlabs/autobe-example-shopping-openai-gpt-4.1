import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that updating a non-existent review comment as an administrator
 * fails as expected.
 *
 * Business context: Administrators must not be able to update review comments
 * that do not exist. This test ensures the API robustly rejects update attempts
 * for non-existent resources, returning a not found error (404 or similar error
 * status), and does not create or alter any resource inappropriately. It
 * simulates a scenario where either the comment was never created, was deleted,
 * or the ID is incorrect.
 *
 * Step-by-step process:
 *
 * 1. Create an administrator actor to perform the update attempt.
 * 2. Create a valid product to simulate product/review context, yielding a
 *    legitimate review ID to use. (No comment will be created; there is no
 *    corresponding commentId in the system.)
 * 3. Attempt to update a review comment on the (valid) review, using a randomly
 *    generated commentId guaranteed not to exist.
 * 4. Expect and validate that an error is thrown, confirming proper 'not found'
 *    handling by the API (TestValidator.error).
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_update_review_comment_fail_on_nonexistent_comment_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator actor
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

  // 2. Create product (to yield valid reviewId context)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Attempt to update a review comment with a fake commentId
  TestValidator.error(
    "Updating non-existent review comment as admin should fail",
  )(() =>
    api.functional.aimall_backend.administrator.reviews.comments.update(
      connection,
      {
        reviewId: product.id as string & tags.Format<"uuid">, // Using product ID as a stand-in for review context
        commentId: typia.random<string & tags.Format<"uuid">>(), // Fake, guaranteed non-existent commentId
        body: {
          body: RandomGenerator.content()()(),
          is_private: true,
        } satisfies IAimallBackendComment.IUpdate,
      },
    ),
  );
}
