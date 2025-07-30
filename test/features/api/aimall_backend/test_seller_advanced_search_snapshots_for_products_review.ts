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
 * Validate seller's advanced snapshot search and filter pagination for own
 * product reviews.
 *
 * This test exercises a complete business flow:
 *
 * 1. Register a new seller account (via administrator flow)
 * 2. Create a product for that seller
 * 3. Register a new customer
 * 4. Have the customer create a review for the product
 * 5. The customer uploads several snapshots for the review, each with different
 *    captions and timestamps
 * 6. Search as the seller for review snapshots with various filters: by caption
 *    (keyword), by created_from/created_to, and test pagination
 * 7. Validate that:
 *
 *    - Only snapshots for this seller's product review are returned
 *    - Filtering by keyword/caption in the snapshot works as expected
 *    - Filtering by created_from and created_to date/time works as expected
 *    - Pagination returns expected page information and results
 *    - Negative test: Filtering by a non-existent keyword yields no results
 *
 * The scenario covers business logic (ownership & permissions), DTO filtering,
 * and multi-step data dependencies.
 */
export async function test_api_aimall_backend_test_seller_advanced_search_snapshots_for_products_review(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "active",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create product for seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: typia.random<string & tags.Format<"uri">>(),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Register customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: RandomGenerator.alphaNumeric(16),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 4. Customer creates a review for the product
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 5. Customer uploads multiple snapshots (different captions/timestamps)
  const snapshotList: IAimallBackendSnapshot[] = [];
  const captions = [
    "bright photo",
    "product angle",
    "in-use shot",
    "unboxing",
    "defect mark",
  ];
  const now = new Date();
  for (let i = 0; i < captions.length; ++i) {
    const created_at = new Date(
      now.getTime() - (captions.length - i) * 60 * 1000,
    ).toISOString();
    const snapshotInput: IAimallBackendSnapshot.ICreate = {
      product_id: product.id,
      customer_id: customer.id,
      media_uri: typia.random<string & tags.Format<"uri">>(),
      caption: captions[i],
      created_at,
    };
    const snap =
      await api.functional.aimall_backend.customer.reviews.snapshots.create(
        connection,
        { reviewId: review.id, body: snapshotInput },
      );
    typia.assert(snap);
    snapshotList.push(snap);
  }

  // 6. Seller searches review snapshots (various filters)
  // (a) All snapshots - unfiltered
  const allSnapshotsPage =
    await api.functional.aimall_backend.seller.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(allSnapshotsPage);
  TestValidator.equals("all snapshots listed")(
    allSnapshotsPage.data?.length ?? 0,
  )(captions.length);
  TestValidator.predicate("all listed are for the product")(
    allSnapshotsPage.data
      ? allSnapshotsPage.data.every((s) => s.product_id === product.id)
      : false,
  );
  if (allSnapshotsPage.data)
    for (const s of allSnapshotsPage.data) typia.assert(s);

  // (b) Filter by keyword in caption ("product angle")
  const filteredCaptionPage =
    await api.functional.aimall_backend.seller.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: { caption: "product angle" },
      },
    );
  typia.assert(filteredCaptionPage);
  TestValidator.equals("filtered by caption")(
    filteredCaptionPage.data?.length ?? 0,
  )(1);
  TestValidator.equals("filtered snapshot caption")(
    filteredCaptionPage.data?.[0]?.caption ?? null,
  )("product angle");

  // (c) Filter by create date range (pick middle 3)
  const midStart = snapshotList[1].created_at;
  const midEnd = snapshotList[3].created_at;
  const filteredDatePage =
    await api.functional.aimall_backend.seller.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: { created_from: midStart, created_to: midEnd },
      },
    );
  typia.assert(filteredDatePage);
  TestValidator.equals("filtered by date range")(
    filteredDatePage.data?.length ?? 0,
  )(3);
  TestValidator.predicate("all filtered in range")(
    filteredDatePage.data
      ? filteredDatePage.data.every(
          (snap) => snap.created_at >= midStart && snap.created_at <= midEnd,
        )
      : false,
  );

  // (d) Pagination: limit=2, page=2
  const paged =
    await api.functional.aimall_backend.seller.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: { limit: 2, page: 2 },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination limit")(paged.pagination?.limit ?? 0)(2);
  TestValidator.equals("pagination page")(paged.pagination?.current ?? 0)(2);
  TestValidator.predicate("pagination data length")(
    paged.data ? paged.data.length === 2 || paged.data.length === 1 : false,
  );

  // (e) Negative test: filtering by random missing keyword yields none
  const none =
    await api.functional.aimall_backend.seller.reviews.snapshots.search(
      connection,
      {
        reviewId: review.id,
        body: { caption: "no-such-keyword-unique-xyz" },
      },
    );
  typia.assert(none);
  TestValidator.equals("no snapshot matches keyword")(none.data?.length ?? 0)(
    0,
  );
}
