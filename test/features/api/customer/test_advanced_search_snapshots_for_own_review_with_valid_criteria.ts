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
 * Test advanced search and filtering for review snapshots: ensures only
 * permissible and correct snapshot results for a customer's review.
 *
 * This test covers the business workflow:
 *
 * 1. Register as a customer
 * 2. (Implicit) Login as the customer — registration is assumed to log the user
 *    in.
 * 3. Create a new product review as the customer
 * 4. Upload multiple snapshots/media for the review
 * 5. Use the advanced snapshot search with specific filters on: creation date,
 *    caption keyword, and media URI.
 * 6. Validate that all returned snapshots:
 *
 * - Belong to the correct review, and thus the current customer
 * - Match the given search/filter criteria
 * - The result is paginated correctly and does not leak other customers’ data
 */
export async function test_api_customer_test_advanced_search_snapshots_for_own_review_with_valid_criteria(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: "hashed-password-1",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a product review as this customer
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 3. Upload multiple snapshots linked to this review
  // All array members conform to IAimallBackendSnapshot.ICreate; optional properties (like created_at) are present where needed
  const snapshot_datas: IAimallBackendSnapshot.ICreate[] = [
    ...ArrayUtil.repeat(5)(() => ({
      media_uri: typia.random<string & tags.Format<"uri">>(),
      caption: RandomGenerator.paragraph()(),
    })),
    // Insert a delayed snapshot for date filtering
    {
      media_uri: typia.random<string & tags.Format<"uri">>(),
      caption: "special filter caption",
      created_at: new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
  ];

  // Upload all snapshots
  const snapshots = [] as IAimallBackendSnapshot[];
  for (const data of snapshot_datas) {
    const snap =
      await api.functional.aimall_backend.customer.reviews.snapshots.create(
        connection,
        {
          reviewId: review.id,
          body: data,
        },
      );
    typia.assert(snap);
    snapshots.push(snap);
  }

  // 4. Perform snapshot search with various filters

  // 4a. Filter by caption keyword
  const searchCaption = "special filter caption";
  const result_caption =
    await api.functional.aimall_backend.customer.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {
          caption: searchCaption,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(result_caption);
  TestValidator.predicate("all result captions contain keyword")(
    (result_caption.data ?? []).every((i) =>
      (i.caption ?? "").includes(searchCaption),
    ),
  );
  TestValidator.predicate("only own snapshots are in result")(
    (result_caption.data ?? []).every((i) => i.customer_id === customer.id),
  );

  // 4b. Filter by creation date
  const specialCreatedAt = snapshot_datas[5].created_at! as string &
    tags.Format<"date-time">;
  const result_date =
    await api.functional.aimall_backend.customer.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {
          created_from: specialCreatedAt,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(result_date);
  TestValidator.predicate("all result created_at >= from date")(
    (result_date.data ?? []).every((i) => i.created_at >= specialCreatedAt),
  );

  // 4c. Filter by media_uri (exact, just pick one of uploaded)
  const filtered_media = snapshots[0].media_uri;
  const result_media =
    await api.functional.aimall_backend.customer.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: filtered_media,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(result_media);
  TestValidator.predicate("all result media_uri == search uri")(
    (result_media.data ?? []).every((i) => i.media_uri === filtered_media),
  );

  // 5. Pagination test: limit to 2
  const paged_result =
    await api.functional.aimall_backend.customer.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(paged_result);
  TestValidator.predicate("paged_result limited to 2")(
    (paged_result.data?.length ?? 0) <= 2,
  );

  // 6. No other customers’ data appears (cross-account not tested by current scenario)
}
