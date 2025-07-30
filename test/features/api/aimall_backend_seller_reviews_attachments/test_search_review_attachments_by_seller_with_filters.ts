import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search and filtering of review attachments by seller.
 *
 * This test validates the PATCH endpoint for
 * /aimall-backend/seller/reviews/{reviewId}/attachments, ensuring that sellers
 * can filter and page through attachments uploaded to their own product's
 * review. It walks through a realistic scenario:
 *
 * 1. Create a seller account as an administrator (onboarding).
 * 2. Register a product for this seller.
 * 3. Simulate a customer review for this product.
 * 4. Upload several attachments of varying file types and sizes to the review.
 * 5. Execute multiple PATCH (search) queries to: a. Filter attachments by
 *    file_type (e.g., images vs. documents) b. Filter by
 *    file_size_min/file_size_max c. Page through results using limit/page
 * 6. Validate that only expected attachments are returned for each filter, and
 *    that pagination metadata (current page, limit, total records, total pages)
 *    is accurate.
 *
 * Steps ensure that business rules restrict visibility to this seller's context
 * and that search works for various MIME types, size constraints, and
 * boundaries.
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_search_review_attachments_by_seller_with_filters(
  connection: api.IConnection,
) {
  // 1. Create a seller account via admin onboarding
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(6),
    email: RandomGenerator.alphabets(10) + "@biz.co.kr",
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Register a product for the seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: "https://example.com/img.png",
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create a review for this product (simulate customer)
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: "Test review for attachment search",
    body: RandomGenerator.paragraph()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 4. Upload multiple attachments of different types and sizes
  const attachments: IAimallBackendAttachment[] = [];
  const fileTypes = [
    {
      file_type: "image/jpeg",
      file_uri: "https://files.com/photo1.jpg",
      file_size: 102400,
    },
    {
      file_type: "image/png",
      file_uri: "https://files.com/photo2.png",
      file_size: 204800,
    },
    {
      file_type: "application/pdf",
      file_uri: "https://files.com/doc1.pdf",
      file_size: 524288,
    },
    {
      file_type: "image/jpeg",
      file_uri: "https://files.com/photo3.jpg",
      file_size: 153600,
    },
  ];
  for (const f of fileTypes) {
    const created =
      await api.functional.aimall_backend.seller.reviews.attachments.create(
        connection,
        {
          reviewId: review.id,
          body: {
            review_id: review.id,
            file_uri: f.file_uri,
            file_type: f.file_type,
            file_size: f.file_size,
          },
        },
      );
    typia.assert(created);
    attachments.push(created);
  }

  // 5a. Filter by file_type (e.g. image/jpeg)
  const imgJpegSearch =
    await api.functional.aimall_backend.seller.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: { file_type: "image/jpeg" },
      },
    );
  typia.assert(imgJpegSearch);
  TestValidator.predicate("Returned only JPEG images")(
    imgJpegSearch.data.every((x) => x.file_type === "image/jpeg"),
  );

  // 5b. Filter by min/max file_size
  const sizeSearch =
    await api.functional.aimall_backend.seller.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: { file_size_min: 200000, file_size_max: 550000 },
      },
    );
  typia.assert(sizeSearch);
  TestValidator.predicate("Attachments in specified size range")(
    sizeSearch.data.every(
      (x) => x.file_size >= 200000 && x.file_size <= 550000,
    ),
  );

  // 5c. Pagination – limit 2 per page, get first page
  const page1 =
    await api.functional.aimall_backend.seller.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: { limit: 2, page: 1 },
      },
    );
  typia.assert(page1);
  TestValidator.equals("Pagination page size is 2")(page1.pagination.limit)(2);
  TestValidator.equals("Current page 1")(page1.pagination.current)(1);

  // 5d. Pagination – second page
  const page2 =
    await api.functional.aimall_backend.seller.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: { limit: 2, page: 2 },
      },
    );
  typia.assert(page2);
  TestValidator.equals("Pagination page size is 2")(page2.pagination.limit)(2);
  TestValidator.equals("Current page 2")(page2.pagination.current)(2);
  // The combined number of attachments on both pages should match known count
  TestValidator.equals("Total records matches uploaded count")(
    page1.pagination.records,
  )(attachments.length);
  TestValidator.equals("Total records matches uploaded count")(
    page2.pagination.records,
  )(attachments.length);

  // 6. Final: All search results should only include our uploaded files
  const allSearch =
    await api.functional.aimall_backend.seller.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(allSearch);
  // All returned attachments must exist in our uploaded array
  TestValidator.predicate("Only uploaded attachments returned")(
    allSearch.data.every((result) =>
      attachments.some((att) => att.id === result.id),
    ),
  );
}
