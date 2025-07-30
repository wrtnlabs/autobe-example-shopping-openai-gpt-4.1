import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling for invalid review attachments search filters
 * (customer).
 *
 * This test verifies that the review attachments search endpoint
 * `/aimall-backend/customer/reviews/{reviewId}/attachments` correctly rejects
 * searches with invalid or malformatted filter parameters provided by a
 * customer. Specifically, it should return a validation error if unknown fields
 * or out-of-bounds paging values (e.g., negative page/limit or excessively
 * large limits) are supplied. The endpoint must NOT process such queries, and
 * respond with a clear error without returning results.
 *
 * Test Steps:
 *
 * 1. Create a customer account to make an authenticated request (per dependency)
 * 2. Attempt to search for attachments on a random UUID reviewId using clearly
 *    invalid filter parameters in the request body, such as:
 *
 *    - An unexpected/unknown extra field not in the filter schema
 *    - Out-of-bound values for `page` (e.g., zero or negative)
 *    - Out-of-bound values for `limit` (e.g., -5 or extremely large numbers)
 * 3. Ensure each of these requests is properly rejected with a validation error
 *    (HTTP 4xx), and NO attachments data is returned
 * 4. Validate that the error occurs and no processing/result set is produced
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_search_review_attachments_invalid_filters(
  connection: api.IConnection,
) {
  // 1. Create a new customer for authentication
  const newCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(newCustomer);

  // 2. Try searching with an unknown field
  await TestValidator.error("unknown filter field should throw")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ...typia.random<IAimallBackendAttachment.IRequest>(),
          definitelyNotAField: "unexpected-value", // not in schema, should error
        } as any,
      },
    );
  });

  // 3. Try searching with out-of-bounds paging values
  await TestValidator.error("negative page should throw")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ...typia.random<IAimallBackendAttachment.IRequest>(),
          page: -3, // out of bounds
        },
      },
    );
  });
  await TestValidator.error("negative limit should throw")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ...typia.random<IAimallBackendAttachment.IRequest>(),
          limit: -15, // out of bounds
        },
      },
    );
  });
  await TestValidator.error("absurdly large limit should throw")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          ...typia.random<IAimallBackendAttachment.IRequest>(),
          limit: 1000000, // excessive size, should error
        },
      },
    );
  });
}
