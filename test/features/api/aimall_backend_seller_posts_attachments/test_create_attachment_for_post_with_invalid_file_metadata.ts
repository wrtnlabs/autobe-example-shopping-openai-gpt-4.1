import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test validation enforcement on post attachment creation with invalid file
 * metadata as a seller.
 *
 * This test simulates an attempt by a seller to upload an attachment with
 * intentionally invalid or non-compliant metadata (such as a disallowed file
 * type, an excessively large file size, or a malformed/corrupt file URI) to a
 * post. The main goal is to verify that robust business and type validation is
 * enforced on the backend, and appropriate validation errors are returned
 * detailing the rejection reason instead of accepting the faulty input.
 *
 * Steps:
 *
 * 1. Successfully create a new seller post to use as attachment target.
 * 2. Attempt creation of attachment(s) with the following invalid file metadata
 *    cases: a. Disallowed file type (e.g., "application/x-msdownload"). b.
 *    Excessively large file size, well beyond typical limits (e.g., 100MB+). c.
 *    Malformed URI (e.g., not a valid URI or not starting with expected
 *    protocol scheme).
 * 3. For each invalid case, assert the API call results in an error (rejected
 *    promise) – no record should be created – and ideally confirm the error
 *    describes the specific validation failure (if possible).
 *
 * This ensures the API strictly enforces file metadata requirements for seller
 * post attachments and protects integrity.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_create_attachment_for_post_with_invalid_file_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create post as seller (dependency)
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: "Attachment Validation Test Post",
        body: "Testing attachment file metadata validation.",
        is_private: false,
        customer_id: null,
      },
    },
  );
  typia.assert(post);

  // Step 2a: Disallowed file type
  await TestValidator.error("disallowed file type should be rejected")(() =>
    api.functional.aimall_backend.seller.posts.attachments.create(connection, {
      postId: post.id,
      body: {
        post_id: post.id,
        comment_id: null,
        review_id: null,
        file_uri: "s3://test/invalid.exe",
        file_type: "application/x-msdownload",
        file_size: 12345,
      },
    }),
  );

  // Step 2b: Excessively large file size
  await TestValidator.error("excessive file size should be rejected")(() =>
    api.functional.aimall_backend.seller.posts.attachments.create(connection, {
      postId: post.id,
      body: {
        post_id: post.id,
        comment_id: null,
        review_id: null,
        file_uri: "s3://test/bigfile.jpg",
        file_type: "image/jpeg",
        file_size: 999999999,
      },
    }),
  );

  // Step 2c: Malformed file URI
  await TestValidator.error("malformed uri should be rejected")(() =>
    api.functional.aimall_backend.seller.posts.attachments.create(connection, {
      postId: post.id,
      body: {
        post_id: post.id,
        comment_id: null,
        review_id: null,
        file_uri: "not-a-valid-uri",
        file_type: "image/png",
        file_size: 12345,
      },
    }),
  );
}
