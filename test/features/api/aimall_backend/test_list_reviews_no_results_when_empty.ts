import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate that GET /aimall-backend/reviews returns an empty page if no reviews
 * exist.
 *
 * Business context:
 *
 * - In a freshly initialized system (or for a new product), there should be no
 *   reviews present.
 * - A client querying the reviews endpoint in this situation should receive a
 *   valid paginated response with no data, rather than a 404 or error.
 *
 * Test workflow:
 *
 * 1. Call GET /aimall-backend/reviews with no existing reviews in the system.
 * 2. Ensure the response is a valid paginated summary structure (typia.assert).
 * 3. Validate page "data" is an empty array.
 * 4. Validate total record count is zero and total pages is zero or one (depending
 *    on API semantics), and that this does not throw or return non-200 status.
 * 5. (Edge) Optionally: If pagination values are non-zero (e.g. records=0,
 *    pages=1), the client must still handle the empty data array correctly.
 *
 * Note: No setup required as the system is presumed to be empty. No
 * dependencies. No authentication needed if endpoint is public.
 */
export async function test_api_aimall_backend_reviews_index_empty(
  connection: api.IConnection,
) {
  // 1. Call the GET endpoint for reviews
  const output = await api.functional.aimall_backend.reviews.index(connection);
  // 2. Ensure output is a valid paginated structure
  typia.assert(output);
  // 3. Data array should be empty
  TestValidator.equals("review data empty")(output.data)([]);
  // 4. Record count should be zero
  TestValidator.equals("zero review count")(output.pagination.records)(0);
  // 5. Pages should be zero or one (APIs sometimes return one empty page for zero-record sets)
  TestValidator.predicate("pages is zero or one")(
    output.pagination.pages === 0 || output.pagination.pages === 1,
  );
}
