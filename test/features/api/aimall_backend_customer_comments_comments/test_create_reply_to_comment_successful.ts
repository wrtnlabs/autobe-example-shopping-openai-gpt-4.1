import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test successful creation of a reply (child) comment under a parent comment.
 *
 * This test covers the threaded reply feature in the community comment system,
 * validating that a logged-in customer can create a reply to an existing
 * comment. The main flow:
 *
 * 1. Create a parent (root) comment as an authenticated customer (POST
 *    /aimall-backend/customer/comments).
 * 2. Use POST /aimall-backend/customer/comments/{commentId}/comments to create a
 *    reply, supplying "body", "is_private", and parent reference.
 * 3. Assert the reply's parent_id matches the parent comment's id.
 * 4. Assert the reply's is_private flag matches input.
 * 5. Assert the reply's customer_id is set (reply is attributed to current
 *    customer).
 * 6. Optionally, confirm reply's body matches input.
 */
export async function test_api_aimall_backend_customer_comments_comments_test_create_reply_to_comment_successful(
  connection: api.IConnection,
) {
  // 1. Create a parent comment as thread base
  const parentInput: IAimallBackendComment.ICreate = {
    body: "This is the parent comment.",
    is_private: false,
  };
  const parent: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: parentInput,
    });
  typia.assert(parent);

  // 2. Create a reply (child comment) referencing parent
  const replyInput: IAimallBackendComment.ICreate = {
    body: "This is a reply to the parent.",
    is_private: true,
    parent_id: parent.id,
  };
  const reply: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // 3. Assert parent linkage
  TestValidator.equals("reply parent linkage")(reply.parent_id)(parent.id);
  // 4. Assert privacy flag
  TestValidator.equals("is_private flag")(reply.is_private)(
    replyInput.is_private,
  );
  // 5. Assert reply is assigned to a customer
  TestValidator.predicate("customer_id assigned and not null")(
    !!reply.customer_id,
  );
  // 6. Assert reply body
  TestValidator.equals("reply body matches input")(reply.body)(replyInput.body);
}
