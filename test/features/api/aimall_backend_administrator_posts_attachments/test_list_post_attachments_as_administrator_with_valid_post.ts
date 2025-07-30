import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validates that an administrator can successfully list all attachments for a
 * given community post by postId.
 *
 * This test ensures that files uploaded and associated with a post are
 * retrievable using the administrator API endpoint for listing attachments. It
 * covers creation, attachment upload, and retrieval, and checks that metadata
 * and pagination are correct.
 *
 * Steps:
 *
 * 1. Create a new community post as administrator (to obtain a valid postId).
 * 2. Upload at least one attachment to the created post as administrator (tests
 *    attachment creation logic as well).
 * 3. Call the GET /aimall-backend/administrator/posts/{postId}/attachments
 *    endpoint as administrator to retrieve the list of attachments.
 * 4. Assert that the returned attachments match the uploaded ones (file_uri, type,
 *    size, etc).
 * 5. Check that all metadata fields and pagination structure are present and
 *    correct.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_index_test_list_post_attachments_as_administrator_with_valid_post(
  connection: api.IConnection,
) {
  // 1. Create a new community post as administrator
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()(1)(2),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Upload one or more attachments to the created post.
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    comment_id: null,
    review_id: null,
    file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024,
  };
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      { postId: post.id, body: attachmentInput },
    );
  typia.assert(attachment);

  // 3. Retrieve attachments for this post using administrator endpoint.
  const result =
    await api.functional.aimall_backend.administrator.posts.attachments.index(
      connection,
      { postId: post.id },
    );
  typia.assert(result);

  // 4. Assert at least one attachment is present and matches what was uploaded
  TestValidator.predicate("Attachment list not empty")(result.data.length >= 1);
  const found = result.data.find((att) => att.id === attachment.id);
  TestValidator.predicate("Uploaded attachment found")(!!found);
  if (!found) throw new Error("Uploaded attachment was not found in list");
  TestValidator.equals("Uploaded file_uri matches")(found.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("Uploaded file_type matches")(found.file_type)(
    attachment.file_type,
  );
  TestValidator.equals("Uploaded file_size matches")(found.file_size)(
    attachment.file_size,
  );
  TestValidator.equals("Uploaded post_id matches")(found.post_id)(
    attachment.post_id,
  );

  // 5. Check that required metadata and pagination fields are present
  [found].forEach((a) => {
    TestValidator.predicate("Attachment id present")(
      typeof a.id === "string" && a.id.length > 0,
    );
    TestValidator.predicate("file_uri present")(
      typeof a.file_uri === "string" && a.file_uri.length > 0,
    );
    TestValidator.predicate("file_type present")(
      typeof a.file_type === "string" && a.file_type.length > 0,
    );
    TestValidator.predicate("file_size positive")(
      typeof a.file_size === "number" && a.file_size > 0,
    );
    TestValidator.predicate("created_at present")(
      typeof a.created_at === "string" && a.created_at.length > 0,
    );
  });
  TestValidator.predicate("Pagination info present")(
    !!result.pagination && typeof result.pagination === "object",
  );
  ["current", "limit", "records", "pages"].forEach((field) => {
    TestValidator.predicate(field + " in pagination")(
      field in result.pagination,
    );
  });
}
