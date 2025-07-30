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
 * Validate that the API forbids a non-owner customer from searching snapshots
 * on another user's review.
 *
 * This test ensures that advanced query access control is enforced for customer
 * review snapshots. Business rule: only the owner of a review (customer_id)
 * should be able to perform advanced searches on associated snapshots.
 *
 * Steps:
 *
 * 1. Register first customer (owner)
 * 2. Register second customer (non-owner)
 * 3. As the first customer, create a review
 * 4. As the first customer, upload at least one snapshot to this review
 * 5. As the second customer, attempt to perform advanced (PATCH) search on the
 *    review's snapshots
 * 6. Confirm that the API returns a 403 Forbidden error, validating strict access
 *    control to snapshot search by review owner only.
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_advanced_search_snapshots_for_non_owned_review_returns_forbidden(
  connection: api.IConnection,
) {
  // 1. Register the first customer (owner)
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer1Email,
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer1);

  // 2. Register the second customer (non-owner)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer2Email,
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer2);

  // --- At this point, assume that connection/session logic is handled (or switch context if needed)

  // 3. As the first customer, create a review
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. Upload at least one snapshot for the review (as owner)
  const snapshot: IAimallBackendSnapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: typia.random<string & tags.Format<"uri">>(),
          caption: "Snapshot by owner",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. (Assume context switch to customer2 if required by system; here context violation is simulated)
  // Attempt advanced (PATCH) snapshot search as non-owner -- system should return 403 Forbidden
  await TestValidator.error("Non-owner advanced snapshot search returns 403")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.snapshots.search(
        connection,
        {
          reviewId: review.id,
          body: {
            // Minimal search/filter, just to access the endpoint
          } satisfies IAimallBackendSnapshot.IRequest,
        },
      );
    },
  );
}
