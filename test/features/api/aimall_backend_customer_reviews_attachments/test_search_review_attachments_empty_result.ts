import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that searching for review attachments with criteria that yield no
 * results returns the proper paginated empty-response structure.
 *
 * This test ensures that if a customer requests attachments for a review, using
 * a file_type filter that does not match any uploaded file for that review, the
 * system responds gracefully: returning an empty `data` array and valid
 * pagination metadata.
 *
 * Test steps:
 *
 * 1. Register a customer.
 * 2. Register a product (for context).
 * 3. Create a review linked to the product by the customer.
 * 4. Search for attachments on the review using a file_type filter that does not
 *    exist (e.g. 'application/x-not-present'), and verify:
 *
 * - The `data` array is empty.
 * - The pagination object is valid and consistent (current page/limit = 1,
 *   records/pages = 0).
 *
 * Edge case: ensures no error is thrown, and pagination fields are always
 * present for 0-results scenarios.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_search_review_attachments_empty_result(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: "hashed_password", // For test setup; not exposed
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register a product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(), // Dummy value for test context
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create a review linked to the product by the customer
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 4. Search for attachments on the review with an impossible file_type filter
  const result =
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          file_type: "application/x-not-present",
          limit: 1,
          page: 1,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("data should be empty array")(result.data)([]);
  TestValidator.equals("pagination current page 1")(result.pagination.current)(
    1,
  );
  TestValidator.equals("pagination limit 1")(result.pagination.limit)(1);
  TestValidator.equals("pagination records 0")(result.pagination.records)(0);
  TestValidator.equals("pagination pages 0")(result.pagination.pages)(0);
}
