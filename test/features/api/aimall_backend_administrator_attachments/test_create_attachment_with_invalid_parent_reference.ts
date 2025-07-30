import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate system error handling for creating attachments with invalid parent
 * references.
 *
 * This test ensures that the API rejects attempts to create attachment records
 * referencing non-existent parent entities (post, comment, or review). Proper
 * validation is critical to prevent creation of orphaned or mislinked
 * attachment rows in the database.
 *
 * Steps:
 *
 * 1. Attempt to create an attachment specifying a random (likely non-existent)
 *    UUID for post_id, with comment_id and review_id both null.
 *
 *    - Confirm that the HTTP response is an error (typically 404 or 400), and that
 *         no attachment record is created.
 * 2. Repeat the above but for comment_id (with other parents null).
 * 3. Repeat for review_id (with other parents null).
 * 4. Attempt with all parent references null to check validation error (if
 *    applicable).
 */
export async function test_api_aimall_backend_administrator_attachments_test_create_attachment_with_invalid_parent_reference(
  connection: api.IConnection,
) {
  // 1. Attempt to create with bogus post_id
  await TestValidator.error(
    "should reject attachment creation for non-existent post_id",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          comment_id: null,
          review_id: null,
          file_uri: "s3://test-bucket/nonexistent-post.jpg",
          file_type: "image/jpeg",
          file_size: 10101,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });

  // 2. Attempt to create with bogus comment_id
  await TestValidator.error(
    "should reject attachment creation for non-existent comment_id",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: null,
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          review_id: null,
          file_uri: "s3://test-bucket/nonexistent-comment.jpg",
          file_type: "image/jpeg",
          file_size: 20202,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });

  // 3. Attempt to create with bogus review_id
  await TestValidator.error(
    "should reject attachment creation for non-existent review_id",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: null,
          comment_id: null,
          review_id: typia.random<string & tags.Format<"uuid">>(),
          file_uri: "s3://test-bucket/nonexistent-review.jpg",
          file_type: "image/jpeg",
          file_size: 30303,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });

  // 4. Attempt with all parent references null (should trigger validation error)
  await TestValidator.error(
    "should reject attachment creation with no parent reference",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: null,
          comment_id: null,
          review_id: null,
          file_uri: "s3://test-bucket/no-parent.jpg",
          file_type: "image/jpeg",
          file_size: 40404,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });
}
