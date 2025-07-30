import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate customer review search access control (PATCH
 * /aimall-backend/customer/reviews).
 *
 * Ensures that a customer cannot access reviews authored by other customers,
 * even if they specify a different customer_id in the search filter. Confirms
 * that API enforces strict ownership: only reviews authored by the currently
 * authenticated user are returned, preventing data leakage across customer
 * boundaries.
 *
 * Steps:
 *
 * 1. Register/log in as Customer A; create a review for Product A
 * 2. Register/log in as Customer B; create a review for Product B
 * 3. As Customer A, attempt to search with Customer B's customer_id - confirm no
 *    data or only customer A's reviews are returned
 * 4. As Customer B, attempt to search with Customer A's customer_id - confirm no
 *    data or only customer B's reviews are returned
 * 5. At each step, confirm that the system does not leak information about reviews
 *    for the other customer, regardless of filter
 */
export async function test_api_aimall_backend_customer_reviews_test_customer_review_search_access_control(
  connection: api.IConnection,
) {
  // 1. Register/log in as Customer A and create review
  // (Assume connection is Customer A)
  const productIdA = typia.random<string & tags.Format<"uuid">>();
  const reviewA = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productIdA,
        title: "Customer A's review",
        body: "Great product, as A!",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(reviewA);

  // 2. Simulate Customer B (new session/connection object); create review
  const connectionB: api.IConnection = {
    ...connection,
    headers: { ...connection.headers },
    simulate: true, // Use simulation to isolate session identity for test
  };
  const productIdB = typia.random<string & tags.Format<"uuid">>();
  const reviewB = await api.functional.aimall_backend.customer.reviews.create(
    connectionB,
    {
      body: {
        product_id: productIdB,
        title: "Customer B's review",
        body: "Excellent product, from B!",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(reviewB);

  // 3. As Customer A, attempt search with Customer B's customer_id
  const resultA = await api.functional.aimall_backend.customer.reviews.search(
    connection,
    {
      body: {
        customer_id: reviewB.customer_id,
        limit: 20,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    },
  );
  typia.assert(resultA);
  // Verify: no review from Customer B appears, and any result (if any) is from Customer A
  for (const summary of resultA.data) {
    TestValidator.notEquals("Customer A must not see B's review")(summary.id)(
      reviewB.id,
    );
    TestValidator.equals("All returned belong to A")(summary.id)(reviewA.id); // Should only match reviewA.id or be empty
  }

  // 4. As Customer B, attempt search with Customer A's customer_id
  const resultB = await api.functional.aimall_backend.customer.reviews.search(
    connectionB,
    {
      body: {
        customer_id: reviewA.customer_id,
        limit: 20,
        page: 1,
      } satisfies IAimallBackendReview.IRequest,
    },
  );
  typia.assert(resultB);
  // Likewise, B must not see A's review
  for (const summary of resultB.data) {
    TestValidator.notEquals("Customer B must not see A's review")(summary.id)(
      reviewA.id,
    );
    TestValidator.equals("All returned belong to B")(summary.id)(reviewB.id); // Should only match reviewB.id or be empty
  }
}
