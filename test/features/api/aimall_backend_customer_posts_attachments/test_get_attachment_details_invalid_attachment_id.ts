import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that requesting an attachment with a non-existent attachmentId on a
 * valid post returns an error.
 *
 * Business context: To ensure correct error handling, when a post's owner tries
 * to fetch an attachment that does not exist for that post, the API should
 * return a 404 Not Found error (or an appropriate error).
 *
 * Test workflow:
 *
 * 1. Create a new post as a customer (to obtain a valid postId).
 * 2. Attempt to retrieve an attachment with a random, non-existent attachmentId
 *    for that post via the GET
 *    /aimall-backend/customer/posts/{postId}/attachments/{attachmentId}
 *    endpoint.
 * 3. Assert that the response results in an error (404 or similar), confirming the
 *    API does not leak or fabricate attachments.
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_get_attachment_details_invalid_attachment_id(
  connection: api.IConnection,
) {
  // 1. Create a post to get a valid postId
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

  // 2. Attempt to GET a non-existent attachment on that post
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Should not find attachment with non-existent id")(
    async () => {
      await api.functional.aimall_backend.customer.posts.attachments.at(
        connection,
        {
          postId: post.id,
          attachmentId: invalidAttachmentId,
        },
      );
    },
  );
}
