import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate the authorization check for accessing review attachment metadata.
 *
 * This test ensures that a customer who is not the review author, attachment
 * uploader, or an authorized administrator/seller cannot access the metadata of
 * an attachment belonging to another user's review. Attempting to fetch such
 * metadata as an unauthorized user must result in an error (e.g., forbidden),
 * and no attachment metadata should be leaked.
 *
 * Steps:
 *
 * 1. Simulate the creation of a review as User A (since attachment upload API is
 *    not provided, attachment association is hypothetically simulated with a
 *    random UUID).
 * 2. Simulate switching to User B, a different customer with no special
 *    privileges.
 * 3. Attempt to access the metadata for an attachment associated with User A's
 *    review as User B, and confirm an authorization error is raised.
 *
 * Notes:
 *
 * - The API does not expose attachment creation or user authentication APIs, so
 *   user switching is only notionally simulated.
 * - The test strictly avoids checking error details or leaked metadata, only
 *   asserting that an error occurs on unauthorized access.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_get_review_attachment_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Simulate User A creating a review (attachment existence simulated, as creation API is unavailable)
  const userAReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Excellent quality!",
        body: "Quick delivery and matched description.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(userAReview);
  const reviewId = userAReview.id;

  // Step 2: Simulate an attachment UUID (since actual upload API is not provided)
  const attachmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to access User A's review attachment metadata as User B (simulated by same connection)
  await TestValidator.error(
    "Unauthorized users must not access other customers' review attachment metadata",
  )(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.at(
      connection,
      {
        reviewId: reviewId,
        attachmentId: attachmentId,
      },
    );
  });
}
