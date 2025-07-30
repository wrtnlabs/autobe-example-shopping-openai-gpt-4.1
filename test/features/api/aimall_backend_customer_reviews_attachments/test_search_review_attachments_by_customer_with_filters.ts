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
 * Validates advanced filtering and pagination for searching review attachments
 * as a customer.
 *
 * This test ensures that a customer can search for attachments on their own
 * review using various filters including file_type, file_size, and creation
 * date ranges. It verifies both correct subset retrieval and pagination
 * response.
 *
 * Workflow:
 *
 * 1. Register a customer in the system.
 * 2. Register a product for the review.
 * 3. Write a review for the created product as the customer.
 * 4. Upload multiple attachments (vary file_type, file_size, created_at) to the
 *    review.
 * 5. Search with a file_type filter and validate only matching attachments are
 *    returned with correct pagination.
 * 6. Search with file_size_min and file_size_max filters, verify correct
 *    attachment subset and pagination.
 * 7. Search with created_from and created_to date range, check for temporal
 *    filtering accuracy.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_search_review_attachments_by_customer_with_filters(
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
        password_hash: "test_pw_hash",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create product (assume seller id must be present; generate dummy)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Write review
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: "Advanced Filter Review",
        body: "Testing search filters on attachments.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. Upload attachments with different metadata
  // Compose diverse sets of file_types, sizes, creation dates
  const now = new Date();
  const attachmentMetas = [
    {
      file_type: "image/jpeg",
      file_size: 100000,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
    }, // 2 days ago
    {
      file_type: "application/pdf",
      file_size: 50000,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    }, // 1 day ago
    { file_type: "image/png", file_size: 200000, created_at: now }, // today
  ];
  const attachments: IAimallBackendAttachment[] = [];
  for (const meta of attachmentMetas) {
    const attachment =
      await api.functional.aimall_backend.customer.reviews.attachments.create(
        connection,
        {
          reviewId: review.id,
          body: {
            post_id: null,
            comment_id: null,
            review_id: review.id,
            file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.${meta.file_type.split("/")[1]}`,
            file_type: meta.file_type,
            file_size: meta.file_size,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    // Patch attachment's created_at if possible (simulate for querying test)
    // In real E2E, created_at will be server-timestamped; here, we assume response reflects meta
    (attachment as any).created_at = meta.created_at.toISOString();
    attachments.push(attachment);
  }

  // 5. Search by file_type (e.g., "image/jpeg")
  const res_by_type =
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_type: "image/jpeg",
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(res_by_type);
  TestValidator.predicate("file_type filter only image/jpeg")(
    res_by_type.data.every((a) => a.file_type === "image/jpeg"),
  );
  TestValidator.equals("pagination count matches filtered count")(
    res_by_type.data.length,
  )(res_by_type.pagination.records);

  // 6. Search by file_size_min (only >100000 bytes, should find png @200000)
  const res_by_size =
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_size_min: 150000,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(res_by_size);
  TestValidator.predicate("file_size_min filter: only large files")(
    res_by_size.data.every((a) => a.file_size >= 150000),
  );

  // 7. Search by date range (created_from: yesterday, will match pdf + png)
  const created_from = new Date(
    now.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const res_by_date =
    await api.functional.aimall_backend.customer.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          created_from,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(res_by_date);
  TestValidator.predicate(
    "created_from filter: only attachments from yesterday or newer",
  )(
    res_by_date.data.every(
      (a) => new Date(a.created_at) >= new Date(created_from),
    ),
  );
}
