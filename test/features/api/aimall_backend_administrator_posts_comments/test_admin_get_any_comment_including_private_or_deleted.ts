import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate administrator retrieval of any comment (public, private, or
 * soft-deleted) on a post.
 *
 * Administrators must be able to access, for auditing and moderation, all
 * comment details on posts regardless of comment privacy or logical deletion
 * state.
 *
 * This test exercises the following business workflow and edge cases:
 *
 * 1. Create a post (as a customer)
 * 2. Under the post, create:
 *
 *    - One public comment
 *    - One private comment
 *    - One public comment intended to be soft-deleted
 * 3. Soft-delete the third comment
 * 4. As administrator, retrieve each of the three comments via admin endpoint:
 *
 *    - Confirm all fields for each, regardless of privacy/deletion
 *    - "deleted" comment must have non-null deleted_at, private comment is_private
 *         true
 * 5. Assertions ensure correct business rules and admin visibility
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_admin_get_any_comment_including_private_or_deleted(
  connection: api.IConnection,
) {
  // 1. Create a post (customer role)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2a. Public comment
  const publicComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content()()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicComment);

  // 2b. Private comment
  const privateComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content()()(),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateComment);

  // 2c. Public to-be-deleted comment
  const deletedComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content()()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(deletedComment);

  // 3. Soft-delete third comment
  await api.functional.aimall_backend.customer.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: deletedComment.id,
    },
  );

  // 4a. Admin retrieves public comment
  const readPublic =
    await api.functional.aimall_backend.administrator.posts.comments.at(
      connection,
      {
        postId: post.id,
        commentId: publicComment.id,
      },
    );
  typia.assert(readPublic);
  TestValidator.equals("admin sees public comment ID")(readPublic.id)(
    publicComment.id,
  );
  TestValidator.predicate("public comment is not deleted")(
    readPublic.deleted_at === null || !readPublic.deleted_at,
  );
  TestValidator.equals("public comment is not private")(readPublic.is_private)(
    false,
  );

  // 4b. Admin retrieves private comment
  const readPrivate =
    await api.functional.aimall_backend.administrator.posts.comments.at(
      connection,
      {
        postId: post.id,
        commentId: privateComment.id,
      },
    );
  typia.assert(readPrivate);
  TestValidator.equals("admin sees private comment ID")(readPrivate.id)(
    privateComment.id,
  );
  TestValidator.predicate("private comment is not deleted")(
    readPrivate.deleted_at === null || !readPrivate.deleted_at,
  );
  TestValidator.equals("private comment is private")(readPrivate.is_private)(
    true,
  );

  // 4c. Admin retrieves deleted comment
  const readDeleted =
    await api.functional.aimall_backend.administrator.posts.comments.at(
      connection,
      {
        postId: post.id,
        commentId: deletedComment.id,
      },
    );
  typia.assert(readDeleted);
  TestValidator.equals("admin sees deleted comment ID")(readDeleted.id)(
    deletedComment.id,
  );
  TestValidator.predicate("deleted comment is soft deleted")(
    !!readDeleted.deleted_at,
  );
  TestValidator.equals("deleted comment is not private")(
    readDeleted.is_private,
  )(false);
}
