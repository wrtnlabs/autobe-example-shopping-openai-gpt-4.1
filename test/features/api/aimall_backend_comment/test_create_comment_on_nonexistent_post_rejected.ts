import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test rejection of comment creation using a non-existent postId.
 *
 * This test attempts to create a comment where the supplied post_id references
 * a UUID that does not exist in the posts table. The expectation is that the
 * API will reject the request with a clear foreign key or not-found error,
 * ensuring no comment entity is created and the user receives a descriptive
 * error.
 *
 * Steps:
 *
 * 1. Generate a valid, random UUID that is not associated with any real post.
 * 2. Create a comment request payload using this fake post_id and valid random
 *    content.
 * 3. Call the comment creation API with the fake post_id.
 * 4. Assert that an error is thrown and no comment is created in response.
 * 5. Confirm the error is descriptive and indicates the problem is with the
 *    post_id foreign key.
 *
 * Edge Cases Considered:
 *
 * - Valid UUID format but nonexistent resource (post)
 * - API response is not a successful comment entity
 *
 * Business Goal: Ensure robust server-side validation against comments
 * referencing deleted or nonexistent posts; maintain referential integrity of
 * comments.
 */
export async function test_api_aimall_backend_comment_test_create_comment_on_nonexistent_post_rejected(
  connection: api.IConnection,
) {
  // 1. Generate a random, valid UUID for a non-existent post.
  const fakePostId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Populate a valid comment request payload.
  const commentPayload = {
    post_id: fakePostId,
    review_id: null,
    parent_id: null,
    body: RandomGenerator.paragraph()(),
    is_private: Math.random() < 0.5,
  } satisfies IAimallBackendComment.ICreate;

  // 3. Attempt creation and assert rejection.
  await TestValidator.error(
    "should reject comment creation when post_id does not exist",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: commentPayload,
    });
  });
}
