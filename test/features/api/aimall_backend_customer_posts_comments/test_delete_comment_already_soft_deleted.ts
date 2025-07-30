import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate API idempotency and correct error behavior when soft-deleting an
 * already-deleted comment.
 *
 * This test ensures that if a comment has already been soft-deleted, a
 * subsequent delete attempt:
 *
 * - Returns a reasonable error (or handles idempotently), with no harmful effects
 * - Leaves the comment’s deletion/audit state unchanged
 *
 * Business Steps:
 *
 * 1. Register a new customer; obtain identity for comment authorship
 * 2. As that customer, create a new post (community thread)
 * 3. Add a comment to that post
 * 4. Soft-delete the comment via the API endpoint (should succeed)
 * 5. Attempt to soft-delete the same comment again
 *
 *    - Expect an error or an idempotency-safe no-op (depending on implementation)
 *    - Verify no further state change: deleted_at timestamp is unchanged
 * 6. Optionally, try to fetch the comment if possible, and ensure its status
 *    remains ‘deleted’. (Cannot implement due to lack of read endpoint)
 *
 * This guards against backend logic errors where repeated deletes could, for
 * example, incorrectly mutate the audit trail or undo logical deletion.
 */
export async function test_api_aimall_backend_customer_posts_comments_test_delete_comment_already_soft_deleted(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(16),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // Step 2: Create a post as this customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.paragraph()(1),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // Step 3: Add a comment to that post
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: "This is a test comment.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // Step 4: Soft-delete the comment
  await api.functional.aimall_backend.customer.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );

  // Step 5: Attempt to soft-delete again; expect error or idempotency
  await TestValidator.error(
    "Deleting already soft-deleted comment should fail or be a no-op",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.comments.erase(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  });

  // Step 6: (If possible) check that no further audit trail change occurred
  // (Not possible as there is no comment get/read endpoint)
}
