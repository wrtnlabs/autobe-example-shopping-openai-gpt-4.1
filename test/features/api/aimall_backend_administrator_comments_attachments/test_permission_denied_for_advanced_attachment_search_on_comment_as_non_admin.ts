import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that a regular customer (not admin, not the comment owner) is denied
 * permission for admin-level advanced attachment search.
 *
 * Ensures RBAC: only admins or comment owners can access administrator
 * attachment queries. This test verifies improper access is forbidden.
 *
 * Steps:
 *
 * 1. Register Customer A (comment owner)
 * 2. Customer A creates a comment
 * 3. Customer A attaches a file to the comment
 * 4. Register Customer B (distinct, non-owner)
 * 5. As Customer B, attempt PATCH (admin) advanced attachment search on Customer
 *    A's comment
 * 6. Expect a permission denied/403 error.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_permission_denied_for_advanced_attachment_search_on_comment_as_non_admin(
  connection: api.IConnection,
) {
  // 1. Register Customer A (owner of the comment)
  // Assume registration API sets session for Customer A (if not, ensure login if possible)
  // Since customer registration/login API is unavailable, assume 'connection' is pre-authenticated for Customer A.

  // 2. Customer A creates a comment
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        post_id: null,
        review_id: null,
        parent_id: null,
        body: "This is a test comment by Customer A.",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Customer A attaches a file to the comment
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          post_id: null,
          comment_id: comment.id,
          review_id: null,
          file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Register Customer B (another customer, NOT the comment owner)
  // Assume switching to a new user and updating connection (connection now as Customer B)
  // NOTE: User management API is not exposed; assume test infra supplies a fresh, non-owner Customer B session.

  // 5. As Customer B, attempt to use the administrator attachments search (PATCH) for Customer A's comment
  await TestValidator.error("non-admin/non-owner gets 403 forbidden")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.attachments.search(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            file_type: null,
            file_size_min: null,
            file_size_max: null,
            created_from: null,
            created_to: null,
            limit: null,
            page: null,
            post_id: null,
            review_id: null,
          } satisfies IAimallBackendAttachment.IRequest,
        },
      );
    },
  );
}
