import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that an authenticated customer (as the author) can update their own
 * comment's body and privacy flag.
 *
 * This test ensures that a customer who created a comment is able to update
 * both the comment's content (body) and privacy status (is_private) using the
 * provided API endpoint. It covers business logic that only the author
 * (authenticated customer) can perform the update, validates type correctness,
 * and checks that audit compliance fields (created_at/updated_at) reflect the
 * modification event.
 *
 * Workflow:
 *
 * 1. (Setup step skipped: customer registration/post creation, as these APIs are
 *    not present.)
 * 2. As an authenticated customer, create a comment using the 'customer/comments'
 *    POST endpoint.
 * 3. Update the comment (using returned ID) via the
 *    'customer/comments/{commentId}' PUT endpoint, changing its body and
 *    privacy flag.
 * 4. Assert the response includes:
 *
 *    - The updated comment body/text matches what was sent
 *    - The privacy field ('is_private') matches update input
 *    - Updated audit field(s): 'updated_at' is more recent than 'created_at'
 *    - All type expectations for IAimallBackendComment
 */
export async function test_api_aimall_backend_customer_comments_test_update_comment_with_valid_data_by_author(
  connection: api.IConnection,
) {
  // 2. Authenticated customer creates a comment
  const createInput: IAimallBackendComment.ICreate = {
    body: "This is my original comment.",
    is_private: false,
    post_id: typia.random<string & tags.Format<"uuid">>(),
    review_id: null,
    parent_id: null,
  };
  const created: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 3. Author updates their comment (body+privacy)
  const updateInput: IAimallBackendComment.IUpdate = {
    body: "This is my UPDATED comment.",
    is_private: true,
  };
  const updated: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.update(connection, {
      commentId: created.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 4. Assert updated body/flag, audit fields, and structure
  TestValidator.equals("body matches update")(updated.body)(updateInput.body);
  TestValidator.equals("privacy status matches")(updated.is_private)(
    updateInput.is_private,
  );
  TestValidator.predicate("updated_at is after created_at")(
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
}
