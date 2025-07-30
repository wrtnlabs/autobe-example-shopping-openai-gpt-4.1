import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that an administrator can update any mutable properties of a
 * comment's attachment.
 *
 * This test ensures that admin users can perform moderation or necessary
 * corrections on attachment metadata, regardless of the original uploader. The
 * process includes creating a post (since attachment creation depends on
 * comment context, and only post creation API is provided for setup),
 * synthesizing/mock-fetching a comment with an attachment, updating the
 * attachment as an admin, and verifying that the update is properly reflected.
 *
 * As audit-logging APIs/validation are not exposed, audit log validation is
 * omitted as per implementation feasibility rules.
 *
 * Steps:
 *
 * 1. Create a new post as admin via /aimall-backend/administrator/posts
 *    (dependency).
 * 2. Synthesize a dummy comment and attachment for the post (since no public
 *    comment/create/upload API is provided, simulate IDs for test purposes).
 * 3. Perform an attachment update with admin rights: change one or more mutable
 *    fields (e.g., file_type, file_uri, file_size).
 * 4. Assert the updated properties are returned in the response, matching the
 *    input update.
 * 5. Assert all type requirements for the output response.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_update_comment_attachment_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a post (setup dependency)
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()(1)(1),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Synthesize/mock a comment and attachment under the post
  //    (No comment/attachment creation APIs are exposed, so generate random UUIDs)
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const attachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare attachment update payload
  const update: IAimallBackendAttachment.IUpdate = {
    file_type: "image/png",
    file_uri: `s3://moderation/${attachmentId}.png`,
    file_size: typia.random<number & tags.Type<"int32">>(),
  };

  // 4. Update as admin
  const updated =
    await api.functional.aimall_backend.administrator.comments.attachments.update(
      connection,
      {
        commentId,
        attachmentId,
        body: update,
      },
    );
  typia.assert(updated);

  // 5. Assert the update was applied correctly
  TestValidator.equals("file_type updated")(updated.file_type)(
    update.file_type,
  );
  TestValidator.equals("file_uri updated")(updated.file_uri)(update.file_uri);
  TestValidator.equals("file_size updated")(updated.file_size)(
    update.file_size,
  );
}
