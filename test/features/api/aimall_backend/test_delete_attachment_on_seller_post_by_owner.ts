import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Ensure that a seller can delete their own post attachment correctly.
 *
 * Business Goal: Tests the owner privilege and deletion logic for post
 * attachments. The seller account must be able to remove media from their
 * posts, with hard delete (no soft-deleted field remains). Post-deletion, the
 * attachment must not be accessible or retrievable.
 *
 * Step-by-step Process:
 *
 * 1. Register a seller (simulate onboarding).
 * 2. As the seller, create a post.
 * 3. As the same seller, upload a new attachment to that post.
 * 4. Delete the attachment using the owner account.
 * 5. (If such API existed) Attempt to fetch or list the attachment—should fail or
 *    not find the entry—proving hard delete and proper owner enforcement.
 * 6. (If such API existed) Attempt to delete again and ensure a not-found or error
 *    is raised.
 */
export async function test_api_aimall_backend_test_delete_attachment_on_seller_post_by_owner(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);
  // 2. Create post as seller
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        customer_id: null, // For a seller post
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(post);
  // 3. Upload attachment
  const attachment: IAimallBackendAttachment =
    await api.functional.aimall_backend.seller.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          comment_id: null,
          review_id: null,
          file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 204800,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 4. Delete the attachment
  await api.functional.aimall_backend.seller.posts.attachments.erase(
    connection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );
  // 5 & 6. No listing/get-by-id attachment API available, so cannot further programmatically verify from controller. If/when such API methods are added, test should attempt to fetch and expect a not-found error, or attempt another delete to confirm error/thrown state.
}
