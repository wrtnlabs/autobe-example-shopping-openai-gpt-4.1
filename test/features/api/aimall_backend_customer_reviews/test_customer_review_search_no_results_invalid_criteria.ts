import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate search returns no results for impossible/invalid criteria.
 *
 * This test checks that when the customer attempts to search for reviews using
 * criteria that could not possibly match any review, the API returns a 200 OK
 * with an empty data array and appropriate pagination indicating zero results,
 * not an error status. It covers three sub-cases:
 *
 * - Search by a random (very unlikely) keyword in title
 * - Search with an impossible rating range (e.g., rating_min > rating_max)
 * - Search for a non-existent product_id (random UUID)
 *
 * Steps:
 *
 * 1. Search with a random title_keyword that is highly unlikely to match any
 *    review.
 * 2. Search with rating_min > rating_max.
 * 3. Search with a non-existent product_id.
 * 4. For each scenario, verify:
 *
 *    - API responds 200 OK
 *    - Output.data is an empty array
 *    - Output.pagination.records === 0
 *    - Output.pagination.pages === 0
 */
export async function test_api_aimall_backend_customer_reviews_test_customer_review_search_no_results_invalid_criteria(
  connection: api.IConnection,
) {
  // 1. Search with improbable random keyword
  const output1 = await api.functional.aimall_backend.customer.reviews.search(
    connection,
    {
      body: {
        title_keyword: RandomGenerator.alphaNumeric(24),
        limit: 10,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    },
  );
  typia.assert(output1);
  TestValidator.equals("data empty")(output1.data)([]);
  TestValidator.equals("zero records")(output1.pagination.records)(0);
  TestValidator.equals("zero pages")(output1.pagination.pages)(0);

  // 2. Search with impossible rating range (rating_min > rating_max)
  const output2 = await api.functional.aimall_backend.customer.reviews.search(
    connection,
    {
      body: {
        rating_min: 5,
        rating_max: 1,
        limit: 10,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    },
  );
  typia.assert(output2);
  TestValidator.equals("data empty")(output2.data)([]);
  TestValidator.equals("zero records")(output2.pagination.records)(0);
  TestValidator.equals("zero pages")(output2.pagination.pages)(0);

  // 3. Search with random non-existent product_id
  const output3 = await api.functional.aimall_backend.customer.reviews.search(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    },
  );
  typia.assert(output3);
  TestValidator.equals("data empty")(output3.data)([]);
  TestValidator.equals("zero records")(output3.pagination.records)(0);
  TestValidator.equals("zero pages")(output3.pagination.pages)(0);
}
