import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Advanced snapshot search with no match test.
 *
 * This test validates that when searching for snapshots attached to a specific
 * review, if the search filter excludes all records—such as setting an
 * impossible future date range or a non-matching caption keyword—the response
 * will still correctly use the page schema but return an empty dataset and
 * proper pagination metadata.
 *
 * Step-by-step process:
 *
 * 1. Register a test customer (dependency)
 * 2. Create a product review as this customer (dependency)
 * 3. Execute advanced search for review's snapshots with a filter that cannot
 *    match any (such as future date range)
 * 4. Assert that the returned data array is empty and that pagination metadata
 *    reflects zero records
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_advanced_search_snapshots_for_review_with_no_match(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a review for a random product as this customer
  // (Assume customer authentication context is implied or not required for E2E-internal test)
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id,
        title: "Great product!",
        body: "Amazing performance, highly recommend!",
        rating: 5 as number & tags.Type<"int32">,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Search review's snapshots with a future date range that cannot match any snapshot
  const futureStart = new Date(
    Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 5 years from now
  const futureEnd = new Date(
    Date.now() + 6 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 6 years from now
  const result =
    await api.functional.aimall_backend.customer.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {
          created_from: futureStart,
          created_to: futureEnd,
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(result);

  // 4. Check result structure for empty match
  TestValidator.predicate("no results for future date range")(
    Array.isArray(result.data) && result.data.length === 0,
  );
  if (result.pagination) {
    TestValidator.equals("no record count")(result.pagination.records)(0);
    TestValidator.equals("no pages")(result.pagination.pages)(0);
    TestValidator.equals("current page is 1")(result.pagination.current)(1);
  }
}
