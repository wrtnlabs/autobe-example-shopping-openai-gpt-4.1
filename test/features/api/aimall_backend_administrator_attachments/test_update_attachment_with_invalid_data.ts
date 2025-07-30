import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that updating an attachment with invalid data is rejected by the
 * API.
 *
 * This test simulates end-to-end admin update flows for attachments, focusing
 * on negative validation:
 *
 * 1. Create a valid post as the parent entity.
 * 2. Add a valid attachment linked to the post, obtaining its attachmentId.
 * 3. Try to update the attachment with invalid data in several ways: a) Supply an
 *    invalid file_uri (bad format or forbidden scheme). b) Use an invalid
 *    file_type (not a valid MIME type, e.g., 'bad/type'). c) Provide a
 *    file_size with an unrealistic value (e.g., negative number). d) Attempt to
 *    associate the attachment to a non-existent post by updating post_id (skip
 *    if not supported by API's IUpdate DTO). (Note: We can only test fields
 *    actually updatable via IAimallBackendAttachment.IUpdate.)
 * 4. Assert that each invalid update attempt is rejected and does not update the
 *    record (the correct error is thrown, attachment data is unchanged).
 *
 * Verifies robustness of admin attachment update validation logic.
 */
export async function test_api_aimall_backend_administrator_attachments_test_update_attachment_with_invalid_data(
  connection: api.IConnection,
) {
  // Step 1: Create a valid parent post
  const post = await api.functional.aimall_backend.administrator.posts.create(
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

  // Step 2: Create a valid attachment for the post
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri:
            "s3://bucket/" +
            typia.random<string & tags.Format<"uuid">>() +
            ".jpg",
          file_type: "image/jpeg",
          file_size: 12345,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 3a: Try to update with an invalid file_uri
  await TestValidator.error("invalid file_uri should fail")(async () => {
    await api.functional.aimall_backend.administrator.attachments.update(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          file_uri: "not_a_uri",
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });

  // Step 3b: Try to update with an invalid file_type
  await TestValidator.error("invalid file_type should fail")(async () => {
    await api.functional.aimall_backend.administrator.attachments.update(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          file_type: "bad/type",
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });

  // Step 3c: Try to update with a negative file_size
  await TestValidator.error("negative file_size should fail")(async () => {
    await api.functional.aimall_backend.administrator.attachments.update(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          file_size: -123,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });

  // Step 4: Read attachment to ensure no modification happened (should be unchanged)
  // There is no 'get' endpoint exposed in provided SDK to re-read, so this is omitted.
}
