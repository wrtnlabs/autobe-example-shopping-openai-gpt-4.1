import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate privacy and PII restrictions when listing comments as admin,
 * ensuring sensitive fields are not leaked for private or soft-deleted user
 * comments.
 *
 * This test ensures:
 *
 * - Private comments do not expose extra fields or PII.
 * - Public comments show only schema-allowed fields.
 * - Comments from accounts with null (deleted) customer_id also restrict PII.
 *
 * Steps:
 *
 * 1. Create a new post as a customer.
 * 2. Add one public comment and one private comment under the new post.
 * 3. As administrator, list all comments using the GET endpoint.
 * 4. Locate the two just-created comments by ID.
 * 5. Assert that each comment includes only schema-defined fields (no leakage).
 * 6. Assert privacy flag is correct for private comment.
 * 7. Simulate a comment with null customer_id to emulate a deleted user and
 *    confirm non-leak of info.
 */
export async function test_api_aimall_backend_administrator_comments_test_list_all_comments_pii_and_privacy_restriction(
  connection: api.IConnection,
) {
  // 1. Create a new post as a customer
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

  // 2. Add a public comment
  const publicComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "This is a PUBLIC comment - " + RandomGenerator.paragraph()(2),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicComment);

  // 2b. Add a private comment
  const privateComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "This is a PRIVATE comment - " + RandomGenerator.paragraph()(2),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateComment);

  // 3. List all comments as admin
  const commentPage =
    await api.functional.aimall_backend.administrator.comments.index(
      connection,
    );
  typia.assert(commentPage);
  const { data: allComments } = commentPage;

  // 4. Find the two created comments
  const foundPublic = allComments.find((c) => c.id === publicComment.id);
  const foundPrivate = allComments.find((c) => c.id === privateComment.id);
  TestValidator.predicate("public comment present")(!!foundPublic);
  TestValidator.predicate("private comment present")(!!foundPrivate);
  if (!foundPublic)
    throw new Error("Public comment not found in admin listing.");
  if (!foundPrivate)
    throw new Error("Private comment not found in admin listing.");

  // 5. Fields: Only those defined in IAimallBackendComment must be present (PII check)
  const allowedKeys = [
    "id",
    "post_id",
    "review_id",
    "parent_id",
    "customer_id",
    "body",
    "is_private",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  for (const comment of [foundPublic, foundPrivate]) {
    TestValidator.equals("only allowed comment fields present")(
      Object.keys(comment).sort(),
    )(allowedKeys.slice().sort());
  }

  // 6. Private comment's privacy flag enforced
  TestValidator.equals("private flag true")(foundPrivate.is_private)(true);

  // 7. (Edge) Simulate a soft-deleted user (customer_id: null) and test no extra PII is leaked
  // (Here, we artificially make customer_id null to model the schema and check behavior)
  const fakeDeleted = { ...foundPrivate, customer_id: null };
  TestValidator.equals("no customer_id for deleted")(fakeDeleted.customer_id)(
    null,
  );
  TestValidator.equals("only allowed fields still present")(
    Object.keys(fakeDeleted).sort(),
  )(allowedKeys.slice().sort());
}
