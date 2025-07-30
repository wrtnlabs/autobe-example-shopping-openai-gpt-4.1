import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that uploading an attachment with an invalid file type to a comment
 * fails with a validation error.
 *
 * Business context: Customers can attach files to their comments, but only
 * certain file types are permitted (for example, images or documents, but not
 * executables). This test ensures that the system correctly rejects attachments
 * with unsupported file types to prevent malicious/inadmissible uploads.
 *
 * Test Workflow:
 *
 * 1. Create a community post as a customer (since comments must be attached to
 *    posts).
 * 2. Create a comment attached to the newly created post.
 * 3. Attempt to attach a file to the comment with a file_type indicating a
 *    forbidden type (e.g., 'application/x-msdownload' or '.exe' file).
 * 4. Expect the API to reject the upload and return a validation or business rule
 *    error.
 * 5. Verify that the error actually occurs and that attachments with an invalid
 *    type are not accepted.
 */
export async function test_api_aimall_backend_test_create_attachment_comment_with_invalid_file_type(
  connection: api.IConnection,
) {
  // 1. Create a post to attach comments to
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment to test attachment upload
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph()(1),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Attempt to attach an invalid file type (forbidden)
  const invalidAttachment: IAimallBackendAttachment.ICreate = {
    comment_id: comment.id,
    file_uri: "s3://test-bucket/evil.exe",
    file_type: "application/x-msdownload", // Known forbidden type (commonly blocks .exe files)
    file_size: 51200, // 50 KB (arbitrary)
  };

  // 4. Validate that the API rejects the upload
  await TestValidator.error("Reject forbidden file type attachment")(
    async () => {
      await api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: invalidAttachment,
        },
      );
    },
  );
}
