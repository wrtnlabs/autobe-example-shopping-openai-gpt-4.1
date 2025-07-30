import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that searching for attachments using a non-existent reviewId returns an
 * error.
 *
 * This test validates the review attachments search endpoint's error-handling
 * for invalid input, specifically ensuring that providing a random/non-existent
 * UUID as the reviewId parameter causes a 404 Not Found (or similar) error, and
 * does not leak information about internal data or system state.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is extremely unlikely to exist as a reviewId in
 *    the database.
 * 2. Construct a (minimal/default) IAimallBackendAttachment.IRequest query for the
 *    attachment search.
 * 3. Call the administrator review attachments search endpoint with the fake
 *    reviewId.
 * 4. Assert that an error is thrown, specifically looking for a 404 error or
 *    another error indicating the review does not exist.
 * 5. (Negative control) Optionally, check that the error does not include
 *    sensitive information about system state or data.
 */
export async function test_api_aimall_backend_test_search_review_attachments_by_nonexistent_review(
  connection: api.IConnection,
) {
  // Step 1: Generate a random UUID for a non-existent review
  const nonexistentReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Prepare a basic request body
  const request: IAimallBackendAttachment.IRequest = {};

  // Step 3 & 4: Attempt search and catch error
  await TestValidator.error("Non-existent reviewId should yield 404 error")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.attachments.search(
        connection,
        {
          reviewId: nonexistentReviewId,
          body: request,
        },
      );
    },
  );
}
