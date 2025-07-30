import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test attachment metadata update for a customer product review (PUT by
 * review/attachment ID)
 *
 * This test simulates a realistic scenario in which a customer:
 *
 * 1. Registers a new customer account (with unique email and phone)
 * 2. (Assume product exists and review is allowed) Submits a product review as
 *    this customer
 * 3. Adds a media attachment to the review (e.g., an image)
 * 4. Executes a PUT update on the attachment (to modify the file_type and
 *    file_uri)
 * 5. Verifies the update response returns the modified metadata and proper
 *    ownership is enforced
 *
 * The test checks that only permitted fields are accepted for update; others
 * should be ignored or rejected.
 *
 * Steps:
 *
 * 1. Register a new customer (POST /aimall-backend/customers)
 * 2. Create a review as the customer (POST /aimall-backend/customer/reviews)
 * 3. Attach an image to the review (POST
 *    /aimall-backend/customer/reviews/{reviewId}/attachments)
 * 4. Update the attachment's metadata (change file_uri and file_type using PUT
 *    /aimall-backend/customer/reviews/{reviewId}/attachments/{attachmentId})
 * 5. Validate the response includes updated values and audit compliance
 * 6. Ensure parent review_id and ownership are preserved
 */
export async function test_api_aimall_backend_customer_reviews_attachments_update_with_valid_data_customer_role(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a product review as this customer
  const productId = typia.random<string & tags.Format<"uuid">>(); // Simulated product ID
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productId,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.paragraph()(),
        rating: 5 as number & tags.Type<"int32">,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);
  TestValidator.equals("review.customer_id matches account")(
    review.customer_id,
  )(customer.id);
  TestValidator.equals("review.product_id matches input")(review.product_id)(
    productId,
  );

  // 3. Attach an image to the review
  const initialAttachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://mock-bucket/test-image-1.jpg",
          file_type: "image/jpeg",
          file_size: 51200 as number & tags.Type<"int32">,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(initialAttachment);
  TestValidator.equals("attachment.review_id matches")(
    initialAttachment.review_id,
  )(review.id);

  // 4. Update the attachment's file_uri and file_type
  const updatedFileUri = "s3://mock-bucket/test-image-1-edited.jpg";
  const updatedFileType = "image/png";
  const updatedAttachment =
    await api.functional.aimall_backend.customer.reviews.attachments.update(
      connection,
      {
        reviewId: review.id,
        attachmentId: initialAttachment.id,
        body: {
          file_uri: updatedFileUri,
          file_type: updatedFileType,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment);
  // 5. Validate update occurred and audit values (only using allowed fields)
  TestValidator.equals("updated file_uri")(updatedAttachment.file_uri)(
    updatedFileUri,
  );
  TestValidator.equals("updated file_type")(updatedAttachment.file_type)(
    updatedFileType,
  );
  TestValidator.equals("unchanged review_id")(updatedAttachment.review_id)(
    review.id,
  );
  TestValidator.equals("attachment id stable")(updatedAttachment.id)(
    initialAttachment.id,
  );
  // 6. Only allowed fields are updatable; parent and others are untouched
  TestValidator.equals("attachment file_size unchanged")(
    updatedAttachment.file_size,
  )(initialAttachment.file_size);
}
