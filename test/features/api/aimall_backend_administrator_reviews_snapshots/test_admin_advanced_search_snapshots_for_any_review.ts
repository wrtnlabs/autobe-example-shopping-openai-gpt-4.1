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
 * Validates advanced admin snapshot search and audit for any review.
 *
 * This test confirms that an administrator can search and filter snapshots for
 * any review using advanced criteria for audit and moderation purposes.
 *
 * Business Context: Admins may need to review or moderate user-uploaded
 * media/snapshots for any review. Critical: admins must be able to audit
 * snapshots regardless of which user/review they are attached to, using
 * flexible filter criteria (date ranges, keyword matching, or specific media
 * URI partials).
 *
 * Steps:
 *
 * 1. Register two customer accounts (customer1, customer2).
 * 2. Each customer creates a review (review1, review2 for different products).
 * 3. Each customer uploads multiple snapshots to their review (snapshots with
 *    distinct media_uri, caption, and varying creation timestamps).
 * 4. As admin, perform PATCH searches on each review: a. Filter by date range to
 *    ensure only matching snapshots are returned. b. Filter by caption keyword
 *    to match exact snapshots. c. Filter by media_uri (full or partial) to
 *    ensure correct filtering.
 * 5. Validate that the returned snapshot lists match expected filtered results and
 *    that admin can access all snapshots linked to any review.
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_admin_advanced_search_snapshots_for_any_review(
  connection: api.IConnection,
) {
  // 1. Register two customers
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customer1Email,
        phone: RandomGenerator.mobile(),
        password_hash: "hashedpw1",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer1);
  const customer2 = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customer2Email,
        phone: RandomGenerator.mobile(),
        password_hash: "hashedpw2",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer2);

  // 2. Each customer creates a review for different products
  const product1Id = typia.random<string & tags.Format<"uuid">>();
  const product2Id = typia.random<string & tags.Format<"uuid">>();
  const review1 = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product1Id,
        title: "Amazing!",
        body: "Great product, loved it!",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review1);
  const review2 = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product2Id,
        title: "Not bad",
        body: "Pretty good, could be better.",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review2);

  // 3. Each customer uploads 2 snapshots to their review
  const baseTimestamp = new Date();
  const snap1_1 =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review1.id,
        body: {
          media_uri: "https://cdn.test.com/pic-cust1-first.jpg",
          caption: "First shot of customer 1",
          created_at: new Date(
            baseTimestamp.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 2 days ago
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snap1_1);
  const snap1_2 =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review1.id,
        body: {
          media_uri: "https://cdn.test.com/pic-cust1-second.jpg",
          caption: "Second shot with keyword banana",
          created_at: new Date(
            baseTimestamp.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 day ago
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snap1_2);

  const snap2_1 =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review2.id,
        body: {
          media_uri: "https://cdn.test.com/pic-cust2-first.jpg",
          caption: "First snap from cust2",
          created_at: new Date(
            baseTimestamp.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 2 days ago
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snap2_1);
  const snap2_2 =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review2.id,
        body: {
          media_uri: "https://cdn.test.com/banana-pic-cust2.jpg",
          caption: "Banana in pic for cust2",
          created_at: new Date(
            baseTimestamp.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 day ago
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snap2_2);

  // 4-a. Admin: Filter review1's snapshots by date range (only snap1_2, last 36h)
  const from36hAgo = new Date(
    baseTimestamp.getTime() - 1.5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const searchByRecent =
    await api.functional.aimall_backend.administrator.reviews.snapshots.search(
      connection,
      {
        reviewId: review1.id,
        body: {
          created_from: from36hAgo,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(searchByRecent);
  TestValidator.predicate("recent date filter - only snap1_2 present")(
    !!searchByRecent.data &&
      searchByRecent.data.some((s) => s.id === snap1_2.id) &&
      !searchByRecent.data.some((s) => s.id === snap1_1.id),
  );

  // 4-b. Admin: Filter review2's snapshots by caption keyword (should find snap2_2)
  const searchByCaption =
    await api.functional.aimall_backend.administrator.reviews.snapshots.search(
      connection,
      {
        reviewId: review2.id,
        body: {
          caption: "banana",
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(searchByCaption);
  TestValidator.predicate(
    "keyword filter - only matching banana caption present",
  )(
    !!searchByCaption.data &&
      searchByCaption.data.some((s) => s.id === snap2_2.id) &&
      !searchByCaption.data.some((s) => s.id === snap2_1.id),
  );

  // 4-c. Admin: Filter review2's snapshots by media_uri partial match (should find snap2_2)
  const searchByUri =
    await api.functional.aimall_backend.administrator.reviews.snapshots.search(
      connection,
      {
        reviewId: review2.id,
        body: {
          media_uri: "banana",
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(searchByUri);
  TestValidator.predicate("media_uri partial filter - find by banana in uri")(
    !!searchByUri.data && searchByUri.data.some((s) => s.id === snap2_2.id),
  );

  // 5. Confirm admin can see all snapshots of any review
  const allSnapsReview1 =
    await api.functional.aimall_backend.administrator.reviews.snapshots.search(
      connection,
      {
        reviewId: review1.id,
        body: {} satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(allSnapsReview1);
  TestValidator.predicate("has both review1 snaps")(
    !!allSnapsReview1.data &&
      allSnapsReview1.data.some((s) => s.id === snap1_1.id) &&
      allSnapsReview1.data.some((s) => s.id === snap1_2.id),
  );

  const allSnapsReview2 =
    await api.functional.aimall_backend.administrator.reviews.snapshots.search(
      connection,
      {
        reviewId: review2.id,
        body: {} satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(allSnapsReview2);
  TestValidator.predicate("has both review2 snaps")(
    !!allSnapsReview2.data &&
      allSnapsReview2.data.some((s) => s.id === snap2_1.id) &&
      allSnapsReview2.data.some((s) => s.id === snap2_2.id),
  );
}
