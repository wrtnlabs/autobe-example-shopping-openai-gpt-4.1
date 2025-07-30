import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validates that administrators cannot update reviews with invalid data and are
 * subject to schema business rules.
 *
 * This test ensures the admin endpoint
 * /aimall-backend/administrator/reviews/{reviewId} enforces input validation:
 *
 * - Attempts to update a review with an out-of-range rating (0, invalid: only 1-5
 *   allowed)
 * - Attempts to update with no update fields provided (empty object, which is not
 *   a valid operation) Both should fail, confirming validation applies to
 *   admins as well as customers.
 *
 * Steps:
 *
 * 1. Create a valid review as a customer to obtain a review ID
 * 2. Attempt to update review with rating outside valid range (should be rejected)
 * 3. Attempt to update review with empty object (should be rejected)
 */
export async function test_api_aimall_backend_administrator_reviews_test_admin_update_review_with_invalid_data_should_fail(
  connection: api.IConnection,
) {
  // 1. Prepare a valid customer review (dependency)
  const validReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Valid review for admin test",
        body: "This is a correct review setup for invalid update tests.",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(validReview);

  // 2. Admin update: supply rating out of bounds (should fail)
  await TestValidator.error(
    "Admin update with out-of-range rating is rejected",
  )(async () => {
    await api.functional.aimall_backend.administrator.reviews.update(
      connection,
      {
        reviewId: validReview.id,
        body: { rating: 0 }, // Invalid rating (must be 1-5)
      },
    );
  });

  // 3. Admin update: empty update object (should fail, nothing to update)
  await TestValidator.error("Admin update with empty body is rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.update(
        connection,
        {
          reviewId: validReview.id,
          body: {}, // Invalid: must provide at least one updatable field
        },
      );
    },
  );
}
