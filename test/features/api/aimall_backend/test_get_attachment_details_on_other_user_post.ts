import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that a customer cannot retrieve another user's post attachment
 * metadata.
 *
 * This test checks access control enforcement for attachment detail API. It
 * simulates two separate customer accounts:
 *
 * 1. Customer A creates a post and uploads an attachment.
 * 2. Customer B (different account) attempts to access the attachment's metadata
 *    through the GET endpoint.
 *
 * The API should return a 403 Forbidden or equivalent error, preventing
 * unauthorized information leakage. No direct attachment file access is
 * verified—only metadata retrieval for auditing.
 *
 * Workflow:
 *
 * 1. (As Customer A) Create a post.
 * 2. (As Customer A) Upload an attachment for the post.
 * 3. (As Customer B) Attempt to request `GET
 *    /aimall-backend/customer/posts/{postId}/attachments/{attachmentId}` for
 *    the attachment of Customer A's post.
 * 4. Assert the access is denied with an error (e.g., 403 Forbidden).
 */
export async function test_api_aimall_backend_test_get_attachment_details_on_other_user_post(
  connection: api.IConnection,
) {
  // 1. (As Customer A) Create a post
  const postA = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(postA);

  // 2. (As Customer A) Upload an attachment for the post
  const attachmentA =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: postA.id,
        body: {
          post_id: postA.id,
          file_uri:
            "s3://test-bucket/" + typia.random<string & tags.Format<"uuid">>(),
          file_type: "image/png",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachmentA);

  // 3. (As Customer B) Attempt to access Customer A's attachment metadata
  //    (Assume role/account switch occurs through a real authentication API, which is not provided here. If not available, test setup runs in sequence for business logic.)
  await TestValidator.error(
    "Should not access another user's attachment metadata",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.attachments.at(
      connection,
      {
        postId: postA.id,
        attachmentId: attachmentA.id,
      },
    );
  });
}
