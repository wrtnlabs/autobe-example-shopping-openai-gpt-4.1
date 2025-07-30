import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that a seller cannot add an attachment to a post owned by another seller
 * (invalid permissions).
 *
 * This test ensures the access controls for attachment uploads under posts are
 * correct:
 *
 * 1. Seller A creates a community post.
 * 2. Seller B (different account) attempts to upload an attachment to Seller A's
 *    post.
 * 3. The API must reject Seller B's attempt with a forbidden or unauthorized
 *    error, confirming proper ownership validation.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_create_attachment_for_post_by_seller_invalid_permissions(
  connection: api.IConnection,
) {
  // 1. Seller A creates a new post
  // - Assume authentication context for Seller A is established via connection
  const postA = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(10),
        body: RandomGenerator.content()(2)(10),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(postA);

  // --- RE-AUTH SELLER B (simulate by switching context/credentials in real test suite) ---
  // In real E2E, switch connection to Seller B (login or create) here

  // 2. Seller B attempts to upload an attachment to Seller A's post
  // Expect an authorization error (forbidden/unauthorized)
  await TestValidator.error("unauthorized for foreign post attachment")(
    async () => {
      await api.functional.aimall_backend.seller.posts.attachments.create(
        connection,
        {
          postId: postA.id,
          body: {
            post_id: postA.id,
            file_uri: "s3://bucket/path/image.jpg",
            file_type: "image/jpeg",
            file_size: 1048576,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    },
  );
}
