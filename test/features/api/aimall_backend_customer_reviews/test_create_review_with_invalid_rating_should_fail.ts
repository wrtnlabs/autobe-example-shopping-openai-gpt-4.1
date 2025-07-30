import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate rating value constraints during review creation.
 *
 * This test verifies the review creation API correctly rejects requests where
 * the customer attempts to submit a review with a rating value outside the
 * allowed bounds (i.e., below 1 or above 5). Star ratings must only be accepted
 * if their integer value is within 1–5, and any attempt to send a value outside
 * this range should result in a validation (error) response from the system.
 *
 * Steps:
 *
 * 1. Prepare a minimal valid payload but with an invalid rating (e.g., 0).
 * 2. Attempt to call the review creation endpoint, expecting an error.
 * 3. Repeat using an excessively high rating (e.g., 6; also invalid).
 * 4. For both cases, confirm the API returns an error (validation failure).
 * 5. Verify no valid review record is returned on error.
 */
export async function test_api_aimall_backend_customer_reviews_test_create_review_with_invalid_rating_should_fail(
  connection: api.IConnection,
) {
  // 1. Attempt with rating below minimum (e.g., 0)
  const invalidLowPayload = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Test - invalid rating low",
    body: "Attempting to review with rating 0, should fail.",
    rating: 0,
  } satisfies IAimallBackendReview.ICreate;
  await TestValidator.error("rating below minimum should fail")(() =>
    api.functional.aimall_backend.customer.reviews.create(connection, {
      body: invalidLowPayload,
    }),
  );

  // 2. Attempt with rating above maximum (e.g., 6)
  const invalidHighPayload = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Test - invalid rating high",
    body: "Attempting to review with rating 6, should fail.",
    rating: 6,
  } satisfies IAimallBackendReview.ICreate;
  await TestValidator.error("rating above maximum should fail")(() =>
    api.functional.aimall_backend.customer.reviews.create(connection, {
      body: invalidHighPayload,
    }),
  );
}
