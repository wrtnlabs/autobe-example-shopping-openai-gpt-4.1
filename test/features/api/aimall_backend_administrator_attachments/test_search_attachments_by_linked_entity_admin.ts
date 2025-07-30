import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test administrator attachment search filtered only to review-linked
 * attachments.
 *
 * This test validates that the administrator's PATCH /attachments endpoint
 * correctly returns only attachments linked to reviews (where review_id is set,
 * and post_id and comment_id are null). Attachments associated with posts or
 * comments must not be included in the results when filtering for reviews.
 *
 * Business Scenario:
 *
 * 1. Register an administrator (admin context setup, dependency).
 * 2. Create attachments: one linked to a review, one to a post, one to a comment.
 * 3. Execute a search using the PATCH endpoint, filtering by review_id, with
 *    post_id and comment_id null.
 * 4. Check that all the returned attachments are only those linked to the
 *    specified review, with unrelated attachments excluded.
 *
 * Steps:
 *
 * 1. Register admin user.
 * 2. Register three attachments: (a) review-linked, (b) post-linked, (c)
 *    comment-linked.
 * 3. Search with filter: { review_id: ..., post_id: null, comment_id: null }.
 * 4. Assert that all returned attachments are only linked to the review.
 * 5. Assert that no unrelated attachments appear in results.
 */
export async function test_api_aimall_backend_administrator_attachments_test_search_attachments_by_linked_entity_admin(
  connection: api.IConnection,
) {
  // 1. Register administrator (dependency)
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>() + "@test.com",
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Register attachments
  // (a) Review-linked attachment
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const reviewAttachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          review_id: reviewId,
          post_id: null,
          comment_id: null,
          file_uri: "s3://bucket/review-attach-1.jpg",
          file_type: "image/jpeg",
          file_size: 99999,
        },
      },
    );
  typia.assert(reviewAttachment);

  // (b) Post-linked attachment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const postAttachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          review_id: null,
          post_id: postId,
          comment_id: null,
          file_uri: "s3://bucket/post-attach-1.jpg",
          file_type: "image/jpeg",
          file_size: 88888,
        },
      },
    );
  typia.assert(postAttachment);

  // (c) Comment-linked attachment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const commentAttachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          review_id: null,
          post_id: null,
          comment_id: commentId,
          file_uri: "s3://bucket/comment-attach-1.jpg",
          file_type: "image/jpeg",
          file_size: 77777,
        },
      },
    );
  typia.assert(commentAttachment);

  // 3. Search for review-linked attachments only
  const output =
    await api.functional.aimall_backend.administrator.attachments.search(
      connection,
      {
        body: {
          review_id: reviewId,
          post_id: null,
          comment_id: null,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(output);

  // 4. Assert all returned records are only linked to this review
  for (const attachment of output.data) {
    TestValidator.equals("review_id matches")(attachment.review_id)(reviewId);
    TestValidator.equals("post_id is null")(attachment.post_id)(null);
    TestValidator.equals("comment_id is null")(attachment.comment_id)(null);
  }

  // 5. Ensure there are no unrelated attachments in the results
  TestValidator.predicate("no unrelated attachments present")(
    output.data.every((att) => att.review_id === reviewId),
  );
}
