import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate listing review attachments for a review without attachments.
 *
 * This test confirms the system returns an empty attachment list for a newly
 * created customer review when no attachments exist. The scenario ensures that
 * the endpoint correctly handles and returns an empty array (data) when there
 * are legitimately zero attachments, rather than failing or returning
 * undefined.
 *
 * Steps:
 *
 * 1. Create a new product review via the customer review creation endpoint. No
 *    attachments are uploaded in this process.
 * 2. Immediately query the attachments endpoint for this review ID.
 * 3. Assert that the returned 'data' array exists and is empty (length zero). This
 *    validates precise handling of no-attachment cases.
 * 4. Optionally, check that pagination metadata is present and well-formed.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_no_attachments(
  connection: api.IConnection,
) {
  // 1. Create a new product review (no attachments involved)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: typia.random<number & tags.Type<"int32">>(),
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Query for attachments for this review
  const attachments =
    await api.functional.aimall_backend.customer.reviews.attachments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(attachments);

  // 3. Confirm that the returned array is present and has zero length
  TestValidator.predicate("Returned data array is present and empty")(
    Array.isArray(attachments.data) && attachments.data.length === 0,
  );

  // 4. If pagination metadata is present, verify structure
  if (attachments.pagination) {
    TestValidator.predicate("Pagination object must be present and valid")(
      typeof attachments.pagination === "object" &&
        attachments.pagination !== null,
    );
  }
}
