import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validates that a comment attachment uploaded by Customer A cannot be deleted
 * by Customer B.
 *
 * Business context:
 *
 * - Only the user who uploaded (owns) a comment attachment is authorized to
 *   delete it.
 * - If another customer attempts deletion, the API must return a 403 Forbidden
 *   error and leave the attachment untouched.
 *
 * Steps:
 *
 * 1. Simulate Customer A: create a post, comment, and upload an attachment.
 * 2. Switch identity to Customer B.
 * 3. Attempt to delete the attachment as Customer B, expecting a forbidden error
 *    (403).
 * 4. Optionally: verifying the attachment remains intact is omitted here due to
 *    lack of a corresponding GET/list API.
 */
export async function test_api_aimall_backend_customer_comments_attachments_erase_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // --- 1. Simulate Customer A creates all resources ---

  // (This example assumes registering and switching customers can be done via connection context; actual auth endpoints are not present.)
  // Create a post as Customer A
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // Create a comment as Customer A
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(3),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // Add an attachment to the comment as Customer A
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // --- 2. Switch simulate context to Customer B (new connection with another identity) ---
  // (In a real test, this would require separate tokens/connection per customer.)
  const customerBConnection: api.IConnection = { ...connection };
  // In a real environment, customerBConnection.headers.Authorization would be set to B
  // Not shown: explicit login/registration, so assumes provided connection can switch identity.

  // --- 3. Customer B attempts to delete attachment ---
  await TestValidator.error("non-owner cannot delete attachment")(async () => {
    await api.functional.aimall_backend.customer.comments.attachments.erase(
      customerBConnection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  });

  // (Step 4: Attachments GET/list re-validation omitted, as there is no such API in provided materials)
}
