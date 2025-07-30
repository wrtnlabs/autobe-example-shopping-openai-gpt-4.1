import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search/filter for comment attachments by file type as a
 * customer.
 *
 * This test validates that the customer can create a comment, attach files of
 * multiple types (such as image and pdf), and then perform an advanced search
 * on the comment's attachments filtering by a specific file MIME type (e.g.,
 * image/jpeg), ensuring that only the matching attachments are returned.
 *
 * Steps:
 *
 * 1. Create a new comment as the authenticated customer.
 * 2. Attach an image file (file_type: 'image/jpeg') to the comment.
 * 3. Attach a PDF file (file_type: 'application/pdf') to the comment.
 * 4. Search for attachments on this comment filtered by file_type = 'image/jpeg'.
 * 5. Verify only the image attachment is returned, and its file_type matches
 *    exactly.
 * 6. Search for file_type = 'application/pdf' to verify PDF filtering works as
 *    well.
 * 7. Search with no filter and verify both attachments are present.
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_advanced_search_attachments_for_comment_by_file_type_as_customer(
  connection: api.IConnection,
) {
  // 1. Create a new comment
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: "Advanced attachment search test comment.",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Attach an image file (image/jpeg)
  const imageAttachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://mock-bucket/image-attachment-${comment.id}.jpg`,
          file_type: "image/jpeg",
          file_size: 102400,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(imageAttachment);

  // 3. Attach a PDF file (application/pdf)
  const pdfAttachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://mock-bucket/document-attachment-${comment.id}.pdf`,
          file_type: "application/pdf",
          file_size: 204800,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(pdfAttachment);

  // 4. Search for attachments with file_type = 'image/jpeg'
  const searchImage =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          file_type: "image/jpeg",
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(searchImage);
  TestValidator.equals("only image/jpeg attachment returned")(
    searchImage.data.length,
  )(1);
  TestValidator.equals("image attachment returned")(searchImage.data[0].id)(
    imageAttachment.id,
  );
  TestValidator.equals("image file_type matches")(
    searchImage.data[0].file_type,
  )("image/jpeg");

  // 5. Search for attachments with file_type = 'application/pdf'
  const searchPdf =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          file_type: "application/pdf",
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(searchPdf);
  TestValidator.equals("only application/pdf attachment returned")(
    searchPdf.data.length,
  )(1);
  TestValidator.equals("pdf attachment returned")(searchPdf.data[0].id)(
    pdfAttachment.id,
  );
  TestValidator.equals("pdf file_type matches")(searchPdf.data[0].file_type)(
    "application/pdf",
  );

  // 6. Search with no file_type filter (should return both attachments)
  const searchAll =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {} satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(searchAll);
  TestValidator.predicate("both attachments present")(
    searchAll.data.length >= 2,
  );
  const attachmentIds = searchAll.data.map((a) => a.id);
  TestValidator.predicate("imageAttachment present")(
    attachmentIds.includes(imageAttachment.id),
  );
  TestValidator.predicate("pdfAttachment present")(
    attachmentIds.includes(pdfAttachment.id),
  );
}
