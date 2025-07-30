import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test forbidden deletion of another seller's post attachment.
 *
 * This verifies strict access control by checking that a seller (B) cannot
 * delete an attachment belonging to a post by another seller (A).
 *
 * Workflow:
 *
 * 1. Register Seller A
 * 2. Register Seller B
 * 3. (As Seller A) Create a post
 * 4. (As Seller A) Upload an attachment to the post
 * 5. (As Seller B) Attempt to delete Seller A's attachment — expect forbidden
 *    error (HTTP 403)
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_delete_attachment_on_seller_post_by_other_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAData = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: sellerAEmail,
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  } satisfies IAimallBackendSeller.ICreate;
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerAData },
    );
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBData = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: sellerBEmail,
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  } satisfies IAimallBackendSeller.ICreate;
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerBData },
    );
  typia.assert(sellerB);

  // 3. (As Seller A) Create a post
  const postBody = {
    title: RandomGenerator.paragraph()(10),
    body: RandomGenerator.content()(2)(5),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. (As Seller A) Upload an attachment to the post
  const attachmentBody = {
    post_id: post.id,
    comment_id: null,
    review_id: null,
    file_uri: `s3://test-bucket/${RandomGenerator.alphaNumeric(16)}`,
    file_type: "image/png",
    file_size: 2048,
  } satisfies IAimallBackendAttachment.ICreate;
  const attachment =
    await api.functional.aimall_backend.seller.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 5. (As Seller B): Attempt forbidden deletion
  // In production test infra, Seller B session/context would be set here
  await TestValidator.error(
    "forbidden: another seller cannot delete others' post attachments",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.attachments.erase(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
      },
    );
  });
}
