import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that updating a comment as a non-author results in a
 * forbidden/permission error.
 *
 * This test ensures ownership validation for comment updates:
 *
 * 1. Register Customer A and authenticate (setup assumed)
 * 2. As Customer A, create a new comment
 * 3. Register Customer B and authenticate (setup assumed)
 * 4. As Customer B, attempt to update the comment created by A
 * 5. Verify that a forbidden/unauthorized error is thrown (non-author cannot
 *    update others' comments)
 *
 * This test only implements feasible steps based on available DTOs and API
 * functions. Customer authentication/registration API flows must be handled
 * externally.
 */
export async function test_api_aimall_backend_customer_comments_test_update_comment_with_invalid_author_should_be_forbidden(
  connection: api.IConnection,
) {
  // 1. (Assumed) Register Customer A and authenticate: context must be Customer A

  // 2. As Customer A, create a new comment
  const ownedComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: "Comment by author (Customer A)",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(ownedComment);

  // Store the comment's id for later
  const commentId = ownedComment.id;

  // 3. (Assumed) Register Customer B and authenticate: context must be Customer B

  // 4. As Customer B, attempt to update the comment created by A
  await TestValidator.error("non-author should not update comment")(
    async () => {
      await api.functional.aimall_backend.customer.comments.update(connection, {
        commentId,
        body: {
          body: "Malicious update attempt by Customer B",
          is_private: true,
        } satisfies IAimallBackendComment.IUpdate,
      });
    },
  );
}
