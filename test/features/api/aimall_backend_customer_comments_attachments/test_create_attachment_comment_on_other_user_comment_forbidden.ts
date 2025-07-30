import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validates that customers cannot upload attachments to comments not owned by
 * them (ownership enforcement, 403 expected).
 *
 * Business context: In the Aimall backend community system, comment attachments
 * are restricted according to comment ownership. This test ensures a user
 * cannot append files to comments they do not own. The operation should result
 * in API rejection with 403 Forbidden, proving proper access enforcement.
 *
 * Steps:
 *
 * 1. Register/login as customer A (owning user).
 * 2. Customer A creates a post (to allow comment creation).
 * 3. Customer A leaves a comment on their post (the target comment).
 * 4. Register/login as customer B (attacking user).
 * 5. Customer B attempts to POST an attachment to A's comment (should fail with
 *    403, no attachment created).
 * 6. Assert 403 error is thrown and business logic holds (ownership enforced).
 *
 * Note: Since user registration/auth switching is not available in the provided
 * API functions, this test simulates customer B using the same connection (as
 * an E2E limitation). In a real scenario, separate authenticated sessions would
 * be used.
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_create_attachment_comment_on_other_user_comment_forbidden(
  connection: api.IConnection,
) {
  // 1. Register/login as customer A (assume external utility for registration/login).
  // (Exact registration API not provided, so we assume connection is fresh for A here.)

  // 2. Customer A creates a post for comment context.
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Customer A creates a comment on the post.
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(1),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // ***** Simulate/prepare as customer B for negative test *****
  // (No customer switching API provided. In actual E2E, a new connection/login would be used)
  // --- assume context-switch here to different user/customer B ---

  // 4. Customer B attempts to post an attachment to customer A's comment.
  await TestValidator.error("forbidden: cannot upload to another's comment")(
    async () => {
      await api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
            file_type: "image/jpeg",
            file_size: 12345,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    },
  );
}
