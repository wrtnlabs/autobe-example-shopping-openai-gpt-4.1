import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that an administrator can view all child (reply) comments under a
 * parent, regardless of their privacy setting (public/private), for moderation
 * or audit purposes.
 *
 * This test ensures that administrator privilege overrides privacy:
 *
 * - Precondition: Several comments (parent + replies) are created with varying
 *   privacy flags by different customers.
 * - Action: The administrator lists all child comments beneath the parent (root)
 *   comment.
 * - Assertion: Both public and private child replies are visible to the
 *   administrator, bodies and privacy are correct, and all are active (no soft
 *   deletion).
 *
 * Steps:
 *
 * 1. As a first customer, create the parent/root comment.
 * 2. As a second customer, create a child reply to the parent with 'is_private:
 *    false'.
 * 3. As a third customer, create another child reply to the parent with
 *    'is_private: true'.
 * 4. As administrator, retrieve all direct children under the parent comment using
 *    the admin endpoint.
 * 5. Assert that both public and private replies are present in the response with
 *    correct details.
 * 6. Validate that every result has the test parent_id and is active (not
 *    deleted).
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_lists_all_child_comments_including_private(
  connection: api.IConnection,
) {
  // 1. Create a parent comment (as customer)
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: `Parent thread comment: ${RandomGenerator.paragraph()()}`,
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Create a public child reply (as different customer)
  const publicReplyBody = {
    parent_id: parentComment.id,
    body: `Public child reply: ${RandomGenerator.paragraph()()}`,
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const publicReply =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: publicReplyBody,
      },
    );
  typia.assert(publicReply);

  // 3. Create a private child reply (as another customer)
  const privateReplyBody = {
    parent_id: parentComment.id,
    body: `Private child reply: ${RandomGenerator.paragraph()()}`,
    is_private: true,
  } satisfies IAimallBackendComment.ICreate;
  const privateReply =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: privateReplyBody,
      },
    );
  typia.assert(privateReply);

  // 4. (Simulate admin context) Retrieve all child comments as admin
  const childPage =
    await api.functional.aimall_backend.administrator.comments.comments.index(
      connection,
      {
        commentId: parentComment.id,
      },
    );
  typia.assert(childPage);

  // 5. Assert both replies (public/private) are present - match on body and privacy flag
  const childBodies = childPage.data.map((child) => child.body);
  TestValidator.predicate("admin can see public reply")(
    childBodies.includes(publicReply.body),
  );
  TestValidator.predicate("admin can see private reply")(
    childBodies.includes(privateReply.body),
  );
  // Assert both privacy types are retrievable
  TestValidator.predicate("admin sees private child")(
    childPage.data.some(
      (child) => child.body === privateReply.body && child.is_private === true,
    ),
  );
  TestValidator.predicate("admin sees public child")(
    childPage.data.some(
      (child) => child.body === publicReply.body && child.is_private === false,
    ),
  );

  // 6. Every child has the correct parent_id and is not deleted
  TestValidator.predicate("all children have correct parent_id")(
    childPage.data.every((child) => child.parent_id === parentComment.id),
  );
  TestValidator.predicate("no deleted_at in any child")(
    childPage.data.every(
      (child) => child.deleted_at === null || child.deleted_at === undefined,
    ),
  );
}
