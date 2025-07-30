import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate administrator detail retrieval of product review attachments.
 *
 * Business context:
 *
 * - Administrators must be able to see any review file's metadata for auditing,
 *   moderation, or content investigation, regardless of which customer uploaded
 *   it.
 *
 * Step-by-step process:
 *
 * 1. A customer creates a product review (with uploaded attachment simulated for
 *    test purposes).
 * 2. Obtain the review's id and generate a simulated attachment associated with
 *    this review.
 * 3. Use the admin endpoint to fetch the detail of the attachment using the
 *    reviewId and attachmentId.
 * 4. Assert that returned IAimallBackendAttachment metadata includes all required
 *    fields and correct linkage.
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_get_review_attachment_admin_access(
  connection: api.IConnection,
) {
  // 1. Customer creates a product review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test review with attachment",
        body: "This is a detailed review with a file attachment for admin visibility test.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 2. Simulate an attachment associated with the review (since no upload endpoint provided)
  const attachment: IAimallBackendAttachment = {
    id: typia.random<string & tags.Format<"uuid">>(),
    review_id: review.id,
    file_uri: "s3://test-bucket/test-image.jpg",
    file_type: "image/jpeg",
    file_size: 1024,
    created_at: new Date().toISOString(),
  };
  typia.assert(attachment);

  // 3. As administrator, fetch the detailed metadata for the attachment
  const result =
    await api.functional.aimall_backend.administrator.reviews.attachments.at(
      connection,
      { reviewId: attachment.review_id!, attachmentId: attachment.id },
    );
  typia.assert(result);

  // 4. Assert that all required metadata fields are present and correct
  TestValidator.predicate("attachment id present")(
    typeof result.id === "string" && !!result.id,
  );
  TestValidator.predicate("review id matches")(result.review_id === review.id);
  TestValidator.predicate("file uri present")(
    typeof result.file_uri === "string" && !!result.file_uri,
  );
  TestValidator.predicate("file type present")(
    typeof result.file_type === "string" && !!result.file_type,
  );
  TestValidator.predicate("file size valid")(
    typeof result.file_size === "number" && result.file_size > 0,
  );
  TestValidator.predicate("created_at valid")(
    typeof result.created_at === "string" && !!result.created_at,
  );
}
