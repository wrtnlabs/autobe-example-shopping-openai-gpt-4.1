import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate unauthorized access when searching review attachments by a non-owner
 * customer.
 *
 * This test ensures that the API enforces resource-level security when listing
 * attachments for a review:
 *
 * 1. Create two distinct customer accounts (customerA and customerB).
 * 2. Using customerA, create a review for a product.
 * 3. Simulate user switch to customerB (non-owner customer).
 * 4. Attempt to search review attachments as customerB (PATCH
 *    /aimall-backend/customer/reviews/{reviewId}/attachments).
 * 5. Expect the API to return a permission (403 Forbidden) error, confirming only
 *    the review's owner can access its attachments.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_search_review_attachments_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register customerA
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: `${typia.random<string>()}@customerA.com`,
        phone: `010${Math.floor(10000000 + Math.random() * 90000000)}`,
        password_hash: "hash1234",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerA);

  // 2. Register customerB
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: `${typia.random<string>()}@customerB.com`,
        phone: `010${Math.floor(10000000 + Math.random() * 90000000)}`,
        password_hash: "hash5678",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // --- Simulation: Switch authentication to customerA (OWNER) ---
  // (Assume connection is now authenticated as customerA)

  // 3. Create a review as customerA
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Great product from customerA",
        body: "High quality and shipping.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // --- Simulation: Switch authentication to customerB (NON-OWNER) ---
  // (Assume connection is now authenticated as customerB)

  // 4. Attempt to search review's attachments as the non-owner customerB
  await TestValidator.error("forbidden for non-owner")(async () => {
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {} satisfies IAimallBackendAttachment.IRequest,
      },
    );
  });
}
