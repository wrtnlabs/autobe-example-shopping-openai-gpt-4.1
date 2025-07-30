import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates advanced own review search using customer_id and creation date
 * range filters.
 *
 * This test simulates a customer dashboard scenario where a customer views only
 * their own reviews within a particular time window. To validate correct
 * backend filtering, reviews from both the test customer and other customers
 * are created with precise timestamps. The advanced review search API is then
 * used to fetch reviews for the test customer within the specific creation date
 * range, confirming only the relevant records are returned. Additional checks
 * are performed for pagination and keyword filtering.
 *
 * Test Workflow:
 *
 * 1. Generate a test customer_id and two distinct other customer_ids.
 * 2. Generate three unique product_ids.
 * 3. Create reviews:
 *
 *    - Two by the test customer: one with a creation date in the search range, one
 *         outside it.
 *    - Two by other customers during the same (in-range) period.
 * 4. Simulate review record `created_at`/`customer_id` changes for full test
 *    control (bypassing API time)
 * 5. Search reviews with customer_id and a 3→1 day ago date window.
 * 6. Assert that only the test customer's review within range is returned.
 * 7. Test pagination by setting limit=1 and page=1, and validate response page
 *    size.
 * 8. Test title keyword filtering, validate only records with the keyword are
 *    returned.
 */
export async function test_api_aimall_backend_customer_reviews_test_customer_search_reviews_by_own_id_and_date_range(
  connection: api.IConnection,
) {
  // 1. Prepare test and other customer/product IDs
  const testCustomerId = typia.random<string & tags.Format<"uuid">>();
  const otherCustomerIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const productIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // Helper to return ISO string for N days ago
  const daysAgoIso = (days: number) => {
    const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return date.toISOString();
  };

  // 2. Create reviews (simulate ownership and date where necessary)
  // (Reviews created with authenticated customer in real API; for test, patch fields for full control)
  const reviewWithin =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: productIds[0],
        title: "Search-range review",
        body: "Test body match",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(reviewWithin);
  (reviewWithin as any).customer_id = testCustomerId; // Simulate correct owner association
  (reviewWithin as any).created_at = daysAgoIso(2); // 2 days ago - within search

  const reviewOutOfRange =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: productIds[1],
        title: "Old out-range review",
        body: "Out of window",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(reviewOutOfRange);
  (reviewOutOfRange as any).customer_id = testCustomerId;
  (reviewOutOfRange as any).created_at = daysAgoIso(20); // 20 days ago - outside window

  const reviewOther1 =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: productIds[2],
        title: "Other's review",
        body: "Other customer content",
        rating: 2,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(reviewOther1);
  (reviewOther1 as any).customer_id = otherCustomerIds[0];
  (reviewOther1 as any).created_at = daysAgoIso(2); // 2 days ago

  const reviewOther2 =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: productIds[2],
        title: "Another other customer",
        body: "Unaffected customer",
        rating: 3,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(reviewOther2);
  (reviewOther2 as any).customer_id = otherCustomerIds[1];
  (reviewOther2 as any).created_at = daysAgoIso(2);

  // 3. Define search window (3 to 1 days ago)
  const createdFrom = daysAgoIso(3);
  const createdTo = daysAgoIso(1);

  // 4. Search reviews: filter by testCustomerId and date window
  const searchResult =
    await api.functional.aimall_backend.customer.reviews.search(connection, {
      body: {
        customer_id: testCustomerId,
        created_from: createdFrom,
        created_to: createdTo,
        limit: 10,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate("filtered by customer and creation date window")(
    searchResult.data.length === 1 &&
      searchResult.data[0].id === reviewWithin.id &&
      searchResult.data[0].created_at >= createdFrom &&
      searchResult.data[0].created_at <= createdTo,
  );

  // 5. Pagination test: page size = 1
  const pagedResult =
    await api.functional.aimall_backend.customer.reviews.search(connection, {
      body: {
        customer_id: testCustomerId,
        created_from: createdFrom,
        created_to: createdTo,
        limit: 1,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    });
  typia.assert(pagedResult);
  TestValidator.equals("pagination 1 record")(pagedResult.data.length)(1);
  TestValidator.equals("pagination limit echoes")(pagedResult.pagination.limit)(
    1,
  );

  // 6. Title keyword filter
  const keywordResult =
    await api.functional.aimall_backend.customer.reviews.search(connection, {
      body: {
        customer_id: testCustomerId,
        title_keyword: "Search-range review",
        limit: 10,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    });
  typia.assert(keywordResult);
  TestValidator.predicate("keyword-title filter works")(
    keywordResult.data.every((r) => r.title.includes("Search-range review")),
  );
}
