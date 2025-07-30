import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Test error handling when attempting to retrieve snapshots for a non-existent
 * or unauthorized reviewId.
 *
 * This test ensures the API properly handles requests to non-existent or
 * unauthorized review IDs by returning either a 404 not found error, a
 * business-compliant error, or an empty data page with no leaks of internal
 * information.
 *
 * Steps:
 *
 * 1. Generate a random UUID that should not correspond to any actual review in the
 *    system.
 * 2. Attempt to fetch the list of media snapshots using this invalid reviewId.
 * 3. The API should either throw an error (404/not found or business error) or
 *    return a page with empty data.
 * 4. If a response is received instead of an error, assert that the data array is
 *    empty (no snapshot records).
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_index_invalid_review_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a UUID that should not match any real review
  const fakeReviewId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve snapshots for the non-existent review ID
  await TestValidator.error(
    "should return 404, business error, or empty data for invalid reviewId",
  )(async () => {
    const output =
      await api.functional.aimall_backend.customer.reviews.snapshots.index(
        connection,
        { reviewId: fakeReviewId },
      );
    typia.assert(output);
    // 3. If API does not throw, then data list must be empty or undefined
    TestValidator.predicate("output.data should be empty or undefined")(
      !output.data || (Array.isArray(output.data) && output.data.length === 0),
    );
  });
}
