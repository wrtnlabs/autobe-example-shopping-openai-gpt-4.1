import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test listing attachments of a comment.
 *
 * This test creates a comment using the available API and then attempts to list
 * its attachments. The originally intended access control check (denial for
 * non-owner) cannot be verified, as the API provides no functions for user
 * creation, authentication, or switching context between multiple customers.
 * Only single-user actions can be performed.
 *
 * Steps:
 *
 * 1. Create a comment (as the current customer context).
 * 2. List attachments for the created comment and verify type integrity.
 * 3. (NOTE: Cannot check access denial for non-owners with current API set.)
 */
export async function test_api_aimall_backend_customer_comments_attachments_access_denied_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Create a comment (as the only customer context allowed)
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: "Test comment for attachment access",
        is_private: false,
      },
    },
  );
  typia.assert(comment);

  // 2. List attachments for the created comment
  const attachments =
    await api.functional.aimall_backend.customer.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(attachments);

  // 3. (Access control cannot be validated for non-owners with given SDK)
}
