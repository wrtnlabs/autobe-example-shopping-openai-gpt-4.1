import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate successful update of attachment metadata by a seller.
 *
 * This test confirms that a seller can update the metadata (such as file_uri,
 * file_type, file_size) of an attachment belonging to their own post. The test
 * will:
 *
 * 1. Register a new seller using administrator onboarding.
 * 2. Create a post as that seller (simulating a seller session if required).
 * 3. Attach/upload a file to the seller’s post (creating an attachment record).
 * 4. Update metadata of the attachment (change at least one of file_uri,
 *    file_type, or file_size) via the update API.
 * 5. Verify the response contains the updated fields and the record’s ID matches.
 * 6. (Optional) Re-fetch or directly check the returned object to confirm
 *    persisted changes.
 *
 * The test also checks that:
 *
 * - The returned metadata is as updated.
 * - No extraneous fields have changed.
 * - Seller workflow functions as intended with regard to attachment update
 *   permissions and business rules.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_update_attachment_metadata_by_seller_successfully(
  connection: api.IConnection,
) {
  // 1. Register a new seller (administrator onboarding)
  const createSellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: createSellerInput },
    );
  typia.assert(seller);

  // 2. Create a post as the seller
  const createPostInput: IAimallBackendPost.ICreate = {
    customer_id: null, // Seller-authored post
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()()(2),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: createPostInput },
  );
  typia.assert(post);

  // 3. Upload an attachment to the post
  const attachmentCreateInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    comment_id: null,
    review_id: null,
    file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 12345,
  };
  const attachment =
    await api.functional.aimall_backend.seller.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentCreateInput,
      },
    );
  typia.assert(attachment);

  // 4. Update metadata (modify file_type)
  const updateInput: IAimallBackendAttachment.IUpdate = {
    file_type: "image/png",
  };
  const updated =
    await api.functional.aimall_backend.seller.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Confirm attachment ID matches and metadata updated
  TestValidator.equals("attachment id")(updated.id)(attachment.id);
  TestValidator.equals("file uri unchanged")(updated.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("file type updated")(updated.file_type)("image/png");
  TestValidator.equals("file size unchanged")(updated.file_size)(
    attachment.file_size,
  );

  // 6. (Optionally) confirm persisted changes by fetching again using same API, if available/applicable.
  // No explicit get-by-id API is listed, so we trust response.
}
