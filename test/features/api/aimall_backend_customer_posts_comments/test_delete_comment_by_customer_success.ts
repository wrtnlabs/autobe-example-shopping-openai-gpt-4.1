import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * E2E test for soft-deleting a comment as a customer (happy path, author
 * deletes own comment).
 *
 * This test validates that a customer can create an account, author a post,
 * write a comment, then remove (soft-delete) their own comment on that post.
 *
 * Steps:
 *
 * 1. Register a new test customer (generates random email and phone).
 * 2. [Authentication step omitted - assume session is set by registration, as no
 *    login endpoint provided.]
 * 3. Create a new post as the test customer.
 * 4. Add a comment to the post as the same customer.
 * 5. Soft-delete the comment via the appropriate API.
 *
 * Limitations:
 *
 * - Post-deletion state cannot be verified as there are no 'get comment' or 'list
 *   comments by post' endpoints available.
 * - This test only ensures the erase API call completes without error on the
 *   happy path.
 *
 * If future endpoints allow fetching individual comments or comment lists,
 * assertions should be added to verify the comment's 'deleted_at' field and
 * absence from queries.
 */
export async function test_api_aimall_backend_customer_posts_comments_test_delete_comment_by_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer to act as the commenter
  const email: string = typia.random<string & tags.Format<"email">>();
  const phone: string = RandomGenerator.mobile();
  const password_hash: string = RandomGenerator.alphaNumeric(24);
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        password_hash,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. [Login step omitted – no login endpoint available.]

  // 3. Create a post as the customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a comment by this customer on the post
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Delete (soft-delete) the comment as the author
  await api.functional.aimall_backend.customer.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // No further assertions available on state due to lack of comments querying endpoints.
}
