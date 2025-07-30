import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test valid update of product review attachment metadata by the seller.
 *
 * This test verifies that a seller (who owns the product related to the review)
 * can successfully update metadata of an attachment (such as file_type or
 * file_uri) linked to a product review by a customer. The business rules grant
 * this permission for moderation and error correction purposes. Only permitted
 * fields should be modifiable, and association to review must be immutable.
 *
 * Test Steps:
 *
 * 1. Register a seller via admin API
 * 2. Register a customer
 * 3. Create a product linked to the seller
 * 4. Customer submits a valid review for the product
 * 5. Customer attaches a file to the review
 * 6. Seller updates attachment metadata (e.g., changes file_type or file_uri)
 * 7. Validate that only allowed fields are changed and association fields remain
 *    unchanged
 * 8. Assert the operation succeeds and output structure is correct
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_update_review_attachment_with_valid_data_seller_role(
  connection: api.IConnection,
) {
  // 1. Register a seller via the admin endpoint
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Create a product for the seller
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.content()()(),
        description: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 4. Customer submits a review for the product
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: "Great product!",
        body: RandomGenerator.paragraph()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 5. Customer attaches a file to the review
  const attachment: IAimallBackendAttachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://test-bucket/attachment.jpg",
          file_type: "image/jpeg",
          file_size: 123456,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 6. Seller updates attachment metadata
  const updateResult: IAimallBackendAttachment =
    await api.functional.aimall_backend.seller.reviews.attachments.update(
      connection,
      {
        reviewId: review.id,
        attachmentId: attachment.id,
        body: {
          file_type: "image/png",
          file_uri: "s3://test-bucket/updated-attachment.png",
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  typia.assert(updateResult);

  // 7. Validate mutation is restricted to allowed fields
  TestValidator.equals("Attachment id should remain the same")(updateResult.id)(
    attachment.id,
  );
  TestValidator.equals("Review association is unchanged")(
    updateResult.review_id,
  )(attachment.review_id);
  TestValidator.equals("Attachment file_type updated")(updateResult.file_type)(
    "image/png",
  );
  TestValidator.equals("Attachment file_uri updated")(updateResult.file_uri)(
    "s3://test-bucket/updated-attachment.png",
  );
  TestValidator.equals("file_size remains unchanged")(updateResult.file_size)(
    attachment.file_size,
  );
}
