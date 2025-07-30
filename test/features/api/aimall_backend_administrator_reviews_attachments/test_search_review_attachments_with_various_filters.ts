import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test the search functionality for product review attachments using various
 * filters (admin role scope via PATCH
 * /aimall-backend/administrator/reviews/{reviewId}/attachments).
 *
 * Business context: This test validates the administrator's ability to filter
 * review attachments by file_type (image/video/document), file size, creation
 * date, and pagination-control options. It also checks that only authorized
 * users (admin in this test) can view attachment metadata.
 *
 * Test steps:
 *
 * 1. Create a new product review as a customer (get reviewId).
 * 2. Create several attachments (of different file_type, size, and created_at
 *    values) on the review using the customer endpoint.
 * 3. As administrator, search for attachments using advanced filters: a. By
 *    file_type (e.g., images only) b. By file_size_min/file_size_max (bytes
 *    range) c. By created_from/created_to (date range) d. Pagination:
 *    limit/page
 * 4. For each filter/search, verify returned items match filter criteria.
 * 5. Optionally: Verify unauthorized access is not allowed (not feasible with
 *    provided APIs).
 *
 * Restrictions:
 *
 * - Only implementable role is administrator (search function exists only under
 *   admin API).
 * - No user role switching APIs provided; skip seller/customer view/permission
 *   checks.
 * - No keyword-in-metadata support in available DTOs; skip that aspect.
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_search_review_attachments_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Create a review as customer
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Great product for testing",
        body: "Attachment search scenario testing.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Attach multiple files of varying types, sizes, and created_at (simulate diversity)
  // We'll create 3 files: image, video, doc/pdf (simulate type/size variance)
  const attachments = await Promise.all([
    api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://bucket/image1.jpg",
          file_type: "image/jpeg",
          file_size: 150000,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    ),
    api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://bucket/video1.mp4",
          file_type: "video/mp4",
          file_size: 4500000,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    ),
    api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://bucket/manual.pdf",
          file_type: "application/pdf",
          file_size: 800000,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    ),
  ]);
  attachments.forEach((a) => typia.assert(a));

  // 3. As admin, search for attachments by file_type (image/jpeg)
  const imageSearch =
    await api.functional.aimall_backend.administrator.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_type: "image/jpeg",
          limit: 5,
          page: 1,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(imageSearch);
  imageSearch.data.forEach((att) => {
    TestValidator.equals("file_type filtered")(att.file_type)("image/jpeg");
  });

  // 4. By file_size (between 100k and 1M)
  const sizeSearch =
    await api.functional.aimall_backend.administrator.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_size_min: 100000,
          file_size_max: 1000000,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(sizeSearch);
  sizeSearch.data.forEach((att) => {
    TestValidator.predicate("file_size filtered")(
      att.file_size >= 100000 && att.file_size <= 1000000,
    );
  });

  // 5. By creation date (use the created_at of first attachment)
  const dateFrom = attachments[0].created_at;
  const dateSearch =
    await api.functional.aimall_backend.administrator.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          created_from: dateFrom,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(dateSearch);
  dateSearch.data.forEach((att) => {
    TestValidator.predicate("created_from filtered")(
      att.created_at >= dateFrom,
    );
  });

  // 6. Pagination test (limit 1, page 2)
  const page2 =
    await api.functional.aimall_backend.administrator.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          limit: 1,
          page: 2,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination page")(page2.pagination.current)(2);
  TestValidator.equals("pagination limit")(page2.pagination.limit)(1);
}
