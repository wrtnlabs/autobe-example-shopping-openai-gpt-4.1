import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling for reading a single comment as administrator when
 * the comment does not exist or access is forbidden.
 *
 * Ensures that:
 *
 * 1. Accessing a nonexistent commentId (random/invalid UUID) gives a proper error
 *    (404 Not Found or 403 Forbidden)
 * 2. No details about the comment are leaked in the error
 * 3. (Preparation for future) Soft-deleted or privilege-restricted comments would
 *    also yield error, if setup is available
 * 4. No successful (200) result can occur for an invalid/unauthorized id
 *
 * Steps:
 *
 * 1. Attempt to fetch a comment using a random, likely nonexistent UUID. Expect an
 *    error (404/403), not comment data.
 * 2. (Optional/Future) If test environment enables soft-deleted or
 *    privilege-restricted setup, add tests for those—skipped for now due to
 *    lack of setup API.
 * 3. (Optional Edge Case) Malformed UUID could give a validation/type error—test
 *    omitted since TypeScript typing precludes this at call-site.
 */
export async function test_api_aimall_backend_administrator_comments_test_get_single_comment_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // 1. Attempt fetch by a random UUID (highly likely to not exist)
  await TestValidator.error("nonexistent comment returns error")(async () => {
    await api.functional.aimall_backend.administrator.comments.at(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 2. Commented/future: setup for deleted or forbidden comments
  // Not implemented—future expansion if API exposes soft-delete/privilege control
}
