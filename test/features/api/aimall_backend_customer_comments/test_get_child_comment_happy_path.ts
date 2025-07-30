import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate successful retrieval of a reply (child) comment via child comment
 * GET endpoint.
 *
 * This test assesses the full happy path for fetching a child comment (reply)
 * by its parent and child ID. The process simulates a real customer posting a
 * root comment, then posting a reply to that comment (a child node in the
 * thread). The test then attempts to fetch (GET) the reply directly using the
 * parent (commentId) and child (childCommentId). It asserts that all returned
 * fields—including comment body, author, timestamps, privacy flag, and most
 * importantly parent_id—are correct and maintain the thread integrity. It also
 * ensures access control: retrieval should succeed for the posting author
 * (authenticated), confirming business rules around comment/reply visibility.
 *
 * Test steps:
 *
 * 1. Create a parent comment as a logged-in customer (POST
 *    /aimall-backend/customer/comments)
 * 2. Create a child reply comment under that parent (POST
 *    /aimall-backend/customer/comments/{commentId}/comments)
 * 3. Retrieve the reply comment via GET
 *    /aimall-backend/customer/comments/{commentId}/comments/{childCommentId}
 * 4. Confirm that the reply's parent_id matches the parent's id, all required
 *    fields are present, privacy and timestamps are correct, and customer_id is
 *    set.
 * 5. Assert that the child comment body and is_private match what was posted, and
 *    that the link to parent is honored.
 */
export async function test_api_aimall_backend_customer_comments_test_get_child_comment_happy_path(
  connection: api.IConnection,
) {
  // 1. Create a parent comment as authenticated customer
  const parentBody: IAimallBackendComment.ICreate = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const parentComment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: parentBody,
    });
  typia.assert(parentComment);

  // 2. Create a child reply comment under the parent
  const childBody: IAimallBackendComment.ICreate = {
    parent_id: parentComment.id,
    body: RandomGenerator.paragraph()(),
    is_private: true,
  };
  const childComment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: childBody,
      },
    );
  typia.assert(childComment);

  // 3. Fetch the reply via GET endpoint
  const fetched: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.at(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: childComment.id,
      },
    );
  typia.assert(fetched);

  // 4. Check parent-child linkage and all fields
  TestValidator.equals("fetched child id matches")(fetched.id)(childComment.id);
  TestValidator.equals("fetched parent id matches")(fetched.parent_id)(
    parentComment.id,
  );
  TestValidator.equals("fetched body matches")(fetched.body)(childBody.body);
  TestValidator.equals("fetched privacy matches")(fetched.is_private)(
    childBody.is_private,
  );
  TestValidator.equals("customer id assigned")(fetched.customer_id)(
    childComment.customer_id,
  );
  TestValidator.predicate("created_at is ISO8601")(
    !!Date.parse(fetched.created_at),
  );
  TestValidator.predicate("updated_at is ISO8601")(
    !!Date.parse(fetched.updated_at),
  );
  // parent_id is not null in child and matches parent
  TestValidator.equals("parent_id linkage")(fetched.parent_id)(
    parentComment.id,
  );
  // No deleted_at - should be null or undefined
  TestValidator.equals("not deleted")(fetched.deleted_at ?? null)(null);
}
