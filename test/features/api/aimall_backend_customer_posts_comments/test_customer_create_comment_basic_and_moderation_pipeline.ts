import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate customer comment creation and metadata on a community post.
 *
 * This test ensures:
 *
 * 1. A customer can create a post via the API.
 * 2. The same customer can create a comment on that post.
 * 3. The created comment returns correct metadata: links to the right post, author
 *    matches, privacy flag matches input, and timestamps exist.
 * 4. Tests which require switching user roles (such as additional customers
 *    commenting) are not implemented due to missing dependencies in the
 *    provided API surface.
 *
 * Steps:
 *
 * 1. Create a post as customer
 * 2. Create a comment under that post as the author
 * 3. Assert returned comment links to the correct post, is authored by the current
 *    user, and all important metadata fields are populated and correct
 * 4. Explain test limitations regarding user switching and anti-abuse guardrails
 *    due to unexposed APIs
 */
export async function test_api_aimall_backend_customer_posts_comments_test_customer_create_comment_basic_and_moderation_pipeline(
  connection: api.IConnection,
) {
  // Step 1: Customer creates a post
  const postInput: IAimallBackendPost.ICreate = {
    title: typia.random<string>(),
    body: typia.random<string>(),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // Step 2: Customer creates a comment on their own post
  const commentInput: IAimallBackendComment.ICreate = {
    post_id: post.id,
    review_id: null,
    parent_id: null,
    body: typia.random<string>(),
    is_private: false,
  };
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentInput,
      },
    );
  typia.assert(comment);

  // Step 3: Assert metadata and linkage on returned comment
  TestValidator.equals("comment post_id matches")(comment.post_id)(post.id);
  TestValidator.equals("author matches")(comment.customer_id)(post.customer_id);
  TestValidator.equals("privacy matches")(comment.is_private)(
    commentInput.is_private,
  );
  TestValidator.predicate("created_at present")(
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate("updated_at present")(
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );
  // Note: No explicit moderation status field in DTO; cannot validate moderation pipeline directly.

  // Step 4: Test limitations explained
  // This test does NOT include posting by a different customer, or anti-abuse/role-based restrictions, as authentication APIs for context switching were not provided.
}
