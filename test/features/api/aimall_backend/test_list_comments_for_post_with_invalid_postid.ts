import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling for seller comment listing on non-existent or
 * malformed postId.
 *
 * This test verifies that the API securely rejects requests when attempting to
 * list comments on a post that does not exist or when using an improperly
 * formatted postId. Both cases should trigger errors, and no sensitive
 * information should be revealed in error responses.
 *
 * Steps:
 *
 * 1. Attempt to fetch comments for a syntactically valid, random UUID that is
 *    presumed not to exist. Confirm an error is thrown (typically 404 not
 *    found) and response does not leak internal details.
 * 2. Attempt to fetch comments using a clearly invalid postId (non-UUID string).
 *    Confirm a validation error is thrown, and the error does not expose
 *    sensitive implementation or stack trace information.
 */
export async function test_api_aimall_backend_test_list_comments_for_post_with_invalid_postid(
  connection: api.IConnection,
) {
  // 1. Attempt with a syntactically valid but non-existent UUID
  const nonExistentPostId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("should 404 or not found for non-existent postId")(
    async () => {
      await api.functional.aimall_backend.seller.posts.comments.index(
        connection,
        { postId: nonExistentPostId },
      );
    },
  );

  // 2. Attempt with an obviously malformed postId (invalid UUID format)
  const malformedPostId = "invalid-uuid";
  await TestValidator.error(
    "should throw validation error for malformed postId",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.comments.index(
      connection,
      { postId: malformedPostId as string & tags.Format<"uuid"> },
    );
  });
}
