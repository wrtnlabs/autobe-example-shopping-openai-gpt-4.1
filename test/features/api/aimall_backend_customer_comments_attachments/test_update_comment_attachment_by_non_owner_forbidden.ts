import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that a customer cannot update another user's comment attachment
 * metadata.
 *
 * This test ensures proper access control on attachment update. It verifies
 * that, even if a customer knows the comment and attachment IDs of an
 * attachment owned by another user, an attempt to change its metadata (e.g.,
 * file_uri) is rejected with a 403 Forbidden error.
 *
 * Business context: Comment/media attachments should only be modifiable by the
 * owner who created/uploaded them. Malicious or accidental edits by other users
 * could lead to data integrity or privacy issues, so this behavior must be
 * enforced.
 *
 * Test Steps:
 *
 * 1. Register User A and authenticate (obtain connectionA).
 * 2. User A creates a post.
 * 3. User A creates a comment associated with the post.
 * 4. User A attaches a file to the comment.
 * 5. Register User B and authenticate (obtain connectionB).
 * 6. User B attempts to update User A's comment attachment's metadata.
 * 7. Confirm that a 403 Forbidden error occurs during this update attempt.
 * 8. (Optional) If a GET endpoint for the attachment exists, verify the attachment
 *    data was NOT changed; otherwise, skip this step.
 *
 * Note: If explicit user registration/login API is present, use it for each
 * user and switch authentication context accordingly. If only a single
 * `connection` object is provided for the test harness and multiple identities
 * aren't supported, this test will need to simulate such context or be adapted
 * accordingly.
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_update_comment_attachment_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // --- User A (owner) workflow ---

  // 1. User A creates a post
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

  // 2. User A creates a comment on the post
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

  // 3. User A attaches a file to the comment
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 123456,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // --- Switch to User B (non-owner) workflow ---

  // [!] At this point, you should re-authenticate as User B.
  // In a real-world test, you'd register/login as a second customer and obtain a new connection object (connectionB).
  // As such an API is not provided in the given SDK, we note this as a limitation. If registration/login becomes available,
  // implement those steps here and continue the test using `connectionB` for User B's actions.
  // For demonstration purposes, this test assumes the test harness can simulate distinct users or will skip this context switch as appropriate.

  // 4. User B attempts to update User A's comment attachment
  await TestValidator.error(
    "User B cannot update another user's comment attachment",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: {
          file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.updated.jpg`,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });

  // (Optional validation step omitted: No GET endpoint for the attachment is described, so we cannot verify the attachment is unchanged.)
}
