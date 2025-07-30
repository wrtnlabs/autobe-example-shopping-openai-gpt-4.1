import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that an administrator can update the metadata (file_uri, file_type,
 * file_size) of any review attachment, regardless of author.
 *
 * This test ensures the following scenario:
 *
 * 1. Register a new administrator with sufficient permissions.
 * 2. Register a new customer.
 * 3. As admin, create a product.
 * 4. As customer, create a review for that product.
 * 5. As customer, upload an attachment for the review.
 * 6. As admin, update the attachment's metadata using the administrator endpoint.
 * 7. Confirm that the returned attachment reflects updated fields, remains
 *    associated to the original review, and satisfies all expected
 *    constraints.
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_update_review_attachment_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminPermissionId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: adminPermissionId,
          email: typia.random<string>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 3. Create a new product (admin acting)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Customer creates a review for the product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 5. Customer uploads attachment to the review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://test-bucket/" + typia.random<string>(),
          file_type: "image/png",
          file_size: 123456,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 6. Admin updates the attachment metadata
  const updatedFileUri = "s3://test-bucket/" + typia.random<string>();
  const updatedFileType = "image/jpeg";
  const updatedFileSize = 654321;
  const updatedAttachment =
    await api.functional.aimall_backend.administrator.reviews.attachments.update(
      connection,
      {
        reviewId: review.id,
        attachmentId: attachment.id,
        body: {
          file_uri: updatedFileUri,
          file_type: updatedFileType,
          file_size: updatedFileSize,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment);
  // 7. Validate outcome
  TestValidator.equals("review_id unchanged")(updatedAttachment.review_id)(
    review.id,
  );
  TestValidator.equals("file_uri updated")(updatedAttachment.file_uri)(
    updatedFileUri,
  );
  TestValidator.equals("file_type updated")(updatedAttachment.file_type)(
    updatedFileType,
  );
  TestValidator.equals("file_size updated")(updatedAttachment.file_size)(
    updatedFileSize,
  );
}
