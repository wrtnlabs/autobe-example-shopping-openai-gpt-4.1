import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that seller accounts cannot access attachments of posts they do not
 * own.
 *
 * This test simulates an access-control scenario where two distinct sellers
 * exist. Seller A creates a post (with a presumed attachment). Seller B then
 * attempts to retrieve Seller A's attachment by its IDs. As Seller B does not
 * own the post or its attachments, the API must return a forbidden or
 * unauthorized error.
 *
 * Steps:
 *
 * 1. Seller A creates a post.
 *
 *    - As no direct attachment-creation endpoint is available, a mock attachmentId
 *         is used.
 * 2. Seller B account context assumed (auth context switching is not provided
 *    directly).
 * 3. Seller B attempts to retrieve the attachment of Seller A's post using the
 *    endpoint.
 * 4. The API is expected to throw an authorization error (forbidden/unauthorized),
 *    which is asserted.
 *
 * Note: True attachment creation and multi-user authentication are outside the
 * scope of exposed SDK. Mock IDs are used where necessary.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_get_attachment_detail_for_post_by_seller_with_forbidden_access(
  connection: api.IConnection,
) {
  // 1. Seller A creates a post (simulated originator of the attachment)
  const sellerAPost = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()(1)(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(sellerAPost);

  // [Fixture step]: Simulate the existence of an attachment by generating a mock attachmentId.
  // No actual attachment creation endpoint is available in current materials.
  const mockAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. [Assumed] Seller B context - explicit login/registration not implementable with SDK.

  // 3. Seller B attempts forbidden access to Seller A's attachment.
  await TestValidator.error(
    "forbidden/unauthorized error expected for non-owner access",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.attachments.at(
      connection,
      {
        postId: sellerAPost.id,
        attachmentId: mockAttachmentId,
      },
    );
  });
}
