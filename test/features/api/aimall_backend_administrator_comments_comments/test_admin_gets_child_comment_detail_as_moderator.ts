import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that an administrator (moderator) can retrieve full details of a
 * child (reply) comment for moderation, regardless of privacy settings.
 *
 * This test simulates the core moderation workflow:
 *
 * - Ensures admins can access all comment details, including private replies, for
 *   any investigation or moderation purpose.
 * - Confirms that privacy restrictions on child comments do not apply to
 *   administrators.
 *
 * Step-by-step process:
 *
 * 1. Create a parent comment as a customer (public or private).
 * 2. Create a child (reply) comment under that parent, explicitly private
 *    (is_private=true).
 * 3. As an administrator, retrieve the child comment detail using the admin
 *    endpoint.
 * 4. Validate that all key fields in the result match the child record, including
 *    id, parent_id, body, is_private, and audit timestamps.
 * 5. Confirm that is_private does not restrict admin visibility of reply details.
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_gets_child_comment_detail_as_moderator(
  connection: api.IConnection,
) {
  // 1. Create a parent comment as a customer
  const parentCreate: IAimallBackendComment.ICreate = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const parentComment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: parentCreate,
    });
  typia.assert(parentComment);
  TestValidator.predicate("parent comment has no parent")(
    !parentComment.parent_id,
  );

  // 2. Create a private child (reply) comment under the parent
  const childCreate: IAimallBackendComment.ICreate = {
    parent_id: parentComment.id,
    body: RandomGenerator.paragraph()(),
    is_private: true,
  };
  const childComment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: childCreate,
      },
    );
  typia.assert(childComment);
  TestValidator.equals("child parent_id matches")(childComment.parent_id)(
    parentComment.id,
  );
  TestValidator.equals("is_private of child")(childComment.is_private)(true);

  // 3. As an administrator, fetch the child (reply) comment detail
  // (Assume connection is using admin token)
  const fetched: IAimallBackendComment =
    await api.functional.aimall_backend.administrator.comments.comments.at(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: childComment.id,
      },
    );
  typia.assert(fetched);

  // 4. Validate all returned fields are correct and unrestricted for admin
  TestValidator.equals("child comment id matches")(fetched.id)(childComment.id);
  TestValidator.equals("parent_id matches")(fetched.parent_id)(
    parentComment.id,
  );
  TestValidator.equals("body matches")(fetched.body)(childComment.body);
  TestValidator.equals("is_private matches")(fetched.is_private)(
    childComment.is_private,
  );
  TestValidator.equals("created_at matches")(fetched.created_at)(
    childComment.created_at,
  );
  TestValidator.equals("updated_at matches")(fetched.updated_at)(
    childComment.updated_at,
  );
  TestValidator.equals("customer_id matches")(fetched.customer_id)(
    childComment.customer_id,
  );
  TestValidator.equals("post_id matches")(fetched.post_id)(
    childComment.post_id,
  );
  TestValidator.equals("review_id matches")(fetched.review_id)(
    childComment.review_id,
  );
  TestValidator.equals("deleted_at matches")(fetched.deleted_at)(
    childComment.deleted_at ?? null,
  );

  // 5. Confirm admin can see private comment details (privacy does not hide content)
  TestValidator.equals("admin sees private child comment")(fetched.is_private)(
    true,
  );
  TestValidator.equals("admin sees correct body")(!!fetched.body)(true);
}
