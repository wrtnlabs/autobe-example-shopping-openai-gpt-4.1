import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that a seller cannot search or paginate snapshots for a review
 * unrelated to their own products (should result in 403 Forbidden).
 *
 * Business context: Only the seller who owns the reviewed product should be
 * able to search or paginate its review snapshots. This test ensures that
 * another seller cannot inappropriately access snapshots for unrelated product
 * reviews.
 *
 * Step-by-step process:
 *
 * 1. Register Seller A.
 * 2. Register Seller B.
 * 3. Seller B adds a product.
 * 4. Register a customer.
 * 5. Customer creates a review for Seller B’s product.
 * 6. Customer adds multiple snapshots to that review.
 * 7. Seller A attempts to search/paginate snapshots for that unrelated review
 *    (should get 403 Forbidden).
 */
export async function test_api_aimall_backend_test_seller_search_snapshots_on_unrelated_review_returns_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A.
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerAEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B.
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerBEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Seller B adds a product.
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerB.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 4. Register a customer.
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPhone: string = RandomGenerator.mobile();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates a review for Seller B’s product.
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 6. Customer adds multiple snapshots to the review.
  const numSnapshots = 2;
  for (let i = 0; i < numSnapshots; ++i) {
    const snapshot: IAimallBackendSnapshot =
      await api.functional.aimall_backend.customer.reviews.snapshots.create(
        connection,
        {
          reviewId: review.id,
          body: {
            media_uri: typia.random<string & tags.Format<"uri">>(),
            caption: RandomGenerator.paragraph()(),
          } satisfies IAimallBackendSnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
  }

  // 7. Seller A attempts to search/paginate snapshots for that unrelated review (should get 403).
  await TestValidator.error(
    "403 forbidden when unrelated seller queries review snapshots",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  });
}
