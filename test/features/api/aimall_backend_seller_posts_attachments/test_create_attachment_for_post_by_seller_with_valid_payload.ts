import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate seller can upload an attachment to their own post using a valid
 * payload.
 *
 * This test covers the positive scenario:
 *
 * - Seller creates a post
 * - Seller uploads an attachment file (with URI, type, size) to that post
 * - Returned attachment metadata references the correct post and matches the
 *   input fields
 * - Ensures correct linkage and field-level integrity
 *
 * Workflow:
 *
 * 1. Create a post as the seller (POST /aimall-backend/seller/posts)
 * 2. Upload an attachment to that post (POST
 *    /aimall-backend/seller/posts/{postId}/attachments)
 * 3. Verify the returned attachment references the correct post, and all metadata
 *    fields (file_uri, file_type, file_size) are as expected
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_create_attachment_for_post_by_seller_with_valid_payload(
  connection: api.IConnection,
) {
  // 1. Seller creates a post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Seller uploads an attachment to that post
  const file_uri = `s3://aimall-backend-test-uploads/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const file_type = "image/jpeg";
  const file_size = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
  >(); // 1KB~5MB

  const attachment =
    await api.functional.aimall_backend.seller.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri,
          file_type,
          file_size,
        },
      },
    );
  typia.assert(attachment);

  // 3. Verify returned attachment metadata and linkage
  TestValidator.equals("attachment references post")(attachment.post_id)(
    post.id,
  );
  TestValidator.equals("file uri matches")(attachment.file_uri)(file_uri);
  TestValidator.equals("file type matches")(attachment.file_type)(file_type);
  TestValidator.equals("file size matches")(attachment.file_size)(file_size);
  TestValidator.predicate("post_id is set")(!!attachment.post_id);
  TestValidator.predicate("file_uri is not empty")(!!attachment.file_uri);
  TestValidator.predicate("file_type is not empty")(!!attachment.file_type);
  TestValidator.predicate("file_size positive")(attachment.file_size > 0);
}
