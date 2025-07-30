import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test successful creation of an attachment with valid metadata via admin API.
 *
 * This test validates the POST /aimall-backend/administrator/attachments
 * endpoint for an admin user. It checks:
 *
 * 1. That an administrator can create a community post (used as a parent entity)
 * 2. That an attachment can be registered and properly linked to this post using
 *    file URI/type/size
 * 3. That the returned attachment record contains correct, persisted metadata
 *    matching the input for all fields
 * 4. Compliance to policy: only allowed entity types used, and file_uri follows
 *    expected format
 *
 * The process:
 *
 * 1. Create an admin post (to associate attachment with)
 * 2. Register attachment linked to this post, with valid file fields
 * 3. Assert full record, and match core fields to input
 */
export async function test_api_aimall_backend_administrator_attachments_test_create_attachment_with_valid_metadata(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator (attachment must link to it)
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()()(2),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Prepare a valid attachment creation request linked to the post
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    comment_id: null,
    review_id: null,
    file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<5000000>
    >(),
  };
  const attachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Validate full persisted metadata
  TestValidator.equals("linked post_id")(attachment.post_id)(post.id);
  TestValidator.equals("file_uri")(attachment.file_uri)(
    attachmentInput.file_uri,
  );
  TestValidator.equals("file_type")(attachment.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("file_size")(attachment.file_size)(
    attachmentInput.file_size,
  );
  TestValidator.predicate("created_at valid ISO format")(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/.test(
      attachment.created_at,
    ),
  );
}
