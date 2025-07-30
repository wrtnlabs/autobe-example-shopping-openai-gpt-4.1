import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Verify listing of all attachments for a review with attachments.
 *
 * This test ensures that when a valid reviewId is given for a review with
 * existing attachments, the endpoint returns the full list of attachments, each
 * with correct file info (URI/type/size), and only files visible to the user.
 * Various file/media types are covered (image, video, doc).
 *
 * Steps:
 *
 * 1. Create a review as a customer. (Dependency)
 * 2. Upload image, video, and document attachments to that review. (Dependency)
 * 3. List attachments for that review via the endpoint.
 * 4. Assert that all uploaded attachments are present, matched on
 *    file_uri/type/size.
 * 5. For each summary in the listing, ensure required fields are present.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_index_for_valid_review_with_attachments(
  connection: api.IConnection,
) {
  // 1. Create a review
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Excellent product - attachment test",
    body: "See attached files for media test",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 2. Upload image, video, and document attachments to the review
  const attachmentsInput: IAimallBackendAttachment.ICreate[] = [
    {
      review_id: review.id,
      file_uri: "s3://bucket/review-test-image.jpg",
      file_type: "image/jpeg",
      file_size: 250000,
    },
    {
      review_id: review.id,
      file_uri: "s3://bucket/review-test-video.mp4",
      file_type: "video/mp4",
      file_size: 2089060,
    },
    {
      review_id: review.id,
      file_uri: "s3://bucket/review-test-doc.pdf",
      file_type: "application/pdf",
      file_size: 13900,
    },
  ];
  const createdAttachments: IAimallBackendAttachment[] = [];
  for (const attach of attachmentsInput) {
    const att =
      await api.functional.aimall_backend.customer.reviews.attachments.create(
        connection,
        {
          reviewId: review.id,
          body: attach,
        },
      );
    typia.assert(att);
    createdAttachments.push(att);
  }

  // 3. List attachments
  const page =
    await api.functional.aimall_backend.customer.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(page);
  const data = page.data ?? [];

  // 4. Assert all uploaded attachments are present in listing, matched by file_uri, type, and size
  for (const attInput of attachmentsInput) {
    const summary = data.find(
      (sum) =>
        sum?.file_uri === attInput.file_uri &&
        sum?.file_type === attInput.file_type,
    );
    TestValidator.predicate(
      "Attachment with expected file_uri and type is listed",
    )(!!summary);
    if (summary) {
      TestValidator.equals("file_size matches")(summary.file_size)(
        attInput.file_size,
      );
      TestValidator.equals("file_type matches")(summary.file_type)(
        attInput.file_type,
      );
      TestValidator.equals("file_uri matches")(summary.file_uri)(
        attInput.file_uri,
      );
      TestValidator.predicate("id is a uuid")(
        typeof summary.id === "string" &&
          /^[0-9a-fA-F\-]{36}$/.test(summary.id ?? ""),
      );
    }
  }

  // 5. Ensure required fields present for each summary
  for (const sum of data) {
    TestValidator.predicate("id is present and string")(
      typeof sum.id === "string" && sum.id.length > 0,
    );
    TestValidator.predicate("file_uri is present and non-empty")(
      !!sum.file_uri,
    );
    TestValidator.predicate("file_type is present and non-empty")(
      !!sum.file_type,
    );
    TestValidator.predicate("file_size present, positive number")(
      typeof sum.file_size === "number" && sum.file_size > 0,
    );
  }
}
