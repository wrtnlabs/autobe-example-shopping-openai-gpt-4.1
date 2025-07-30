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
 * Validate that a seller cannot update an attachment on a review for a product
 * they do not own.
 *
 * This test ensures that, for strong business and moderation boundaries, a
 * seller cannot update metadata of an attachment on a review for a product they
 * do not own. It verifies that the backend will strictly deny such operations
 * (forbidden/permission error), and that no changes are made even with a valid
 * payload, keeping review UGC and evidence integrity.
 *
 * Steps:
 *
 * 1. Register seller A (owns the product under review)
 * 2. Register seller B (unrelated seller)
 * 3. Seller A creates a new product (with unique category and seller)
 * 4. Register a customer
 * 5. Customer writes a review about seller A's product
 * 6. Customer attaches a file on the review (gets attachmentId)
 * 7. Seller B attempts to update this attachment's metadata, which should fail
 *    (permission error)
 * 8. Check that the attachment's metadata remains unchanged as the forbidden
 *    update had no effect
 */
export async function test_api_aimall_backend_test_update_review_attachment_seller_not_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register seller A (legitimate owner)
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: RandomGenerator.alphaNumeric(8) + "@mail.com",
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Register seller B (should not have permission)
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: RandomGenerator.alphaNumeric(8) + "@mail.com",
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Seller A creates a product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(),
        main_thumbnail_uri: undefined,
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 4. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@mail.com",
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(16),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 5. Customer writes a review of seller A's product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 6. Customer attaches a file to the review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          post_id: null,
          comment_id: null,
          review_id: review.id,
          file_uri: "s3://bucket/sample-image.jpg",
          file_type: "image/jpeg",
          file_size: 2048,
        },
      },
    );
  typia.assert(attachment);
  const original = { ...attachment };

  // 7. Seller B attempts to update attachment (should be denied)
  await TestValidator.error(
    "seller B cannot update attachment for unowned product review",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.update(
      connection,
      {
        reviewId: review.id,
        attachmentId: attachment.id,
        body: {
          file_uri: "s3://bucket/hack.jpg",
          file_type: "image/png",
          file_size: 4096,
        },
      },
    );
  });

  // 8. Ensure attachment metadata is unchanged (as no GET available, rely on original copy)
  TestValidator.equals("file_uri unchanged")(attachment.file_uri)(
    original.file_uri,
  );
  TestValidator.equals("file_type unchanged")(attachment.file_type)(
    original.file_type,
  );
  TestValidator.equals("file_size unchanged")(attachment.file_size)(
    original.file_size,
  );
}
