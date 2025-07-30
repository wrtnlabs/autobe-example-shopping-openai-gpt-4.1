import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that attachment metadata retrieval works for a valid attachmentId as
 * administrator.
 *
 * This test ensures that when a new post is created, and an attachment is
 * uploaded to it, the attachment metadata can be correctly retrieved via the
 * GET /administrator/attachments/{attachmentId} endpoint. The returned data
 * should include all relevant fields describing the file (file_uri, file_type,
 * file_size, created_at, id, and the associated post_id), and must not include
 * binary file content. It should also follow atomic field rules per the DTO.
 * This test checks for correct linkage between post and attachment, accurate
 * metadata, and schema compliance.
 *
 * Steps:
 *
 * 1. Create a new post as administrator (using posts.create endpoint)
 * 2. Upload an attachment to this post using posts.attachments.create
 * 3. Retrieve the metadata by calling attachments.at with the returned attachment
 *    id
 * 4. Validate that all required metadata is present, values are correct, and that
 *    the returned object does not include file content, only metadata fields as
 *    per IAimallBackendAttachment
 */
export async function test_api_aimall_backend_administrator_attachments_test_retrieve_attachment_metadata_with_valid_attachment_id(
  connection: api.IConnection,
) {
  // 1. Create a new post as administrator
  const postInput = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()(2)(3),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Upload an attachment to the post
  const attachmentInput = {
    post_id: post.id,
    comment_id: null,
    review_id: null,
    file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024,
  } satisfies IAimallBackendAttachment.ICreate;
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Retrieve the metadata for the uploaded attachment
  const metadata =
    await api.functional.aimall_backend.administrator.attachments.at(
      connection,
      {
        attachmentId: attachment.id,
      },
    );
  typia.assert(metadata);

  // 4. Validate the response contains correct metadata and no file content
  TestValidator.equals("id matches")(metadata.id)(attachment.id);
  TestValidator.equals("post_id matches")(metadata.post_id)(post.id);
  TestValidator.equals("file_uri matches")(metadata.file_uri)(
    attachmentInput.file_uri,
  );
  TestValidator.equals("file_type matches")(metadata.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("file_size matches")(metadata.file_size)(
    attachmentInput.file_size,
  );
  TestValidator.equals("created_at exists")(
    typeof metadata.created_at === "string",
  )(true);

  // The following fields should be present
  TestValidator.predicate("No file content in metadata")(
    !("content" in metadata),
  );
}
