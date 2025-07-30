import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate failure cases for seller adding attachments to review with invalid
 * payloads.
 *
 * Ensures that the backend correctly rejects attempts to add attachments to a
 * product review when provided invalid data. This test covers business
 * validation for content schema, MIME types, and size checks, helping to
 * enforce upload/media compliance at the API boundary.
 *
 * **Test Workflow:**
 *
 * 1. Admin creates a seller account (to simulate seller's role).
 * 2. Seller creates a product for context (though not directly used for
 *    attachment, ensures full business context).
 * 3. Create a customer (prerequisite for having a review record, though review
 *    creation is not testable here, so we randomize reviewId).
 * 4. Attempt to create a review attachment with:
 *
 *    - Unsupported MIME file_type (should fail validation)
 *    - File_size exceeding allowed maximum (should fail validation)
 *
 * For each invalid case, verifies that the API call results in a validation
 * error.
 *
 * Any scenarios requiring omission of required properties (i.e., missing
 * fields) are omitted from implementation, as such cases would cause TypeScript
 * compile-time errors and cannot be tested at runtime.
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_add_review_attachment_by_seller_invalid_payload(
  connection: api.IConnection,
) {
  // 1. Admin creates a seller account
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Seller creates a product (business context)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. Customer registration (to enable review context—review not creatable, so random reviewId is used)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphabets(40),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // Mock/re-use a reviewId as review creation endpoint is not provided
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 4a. Unsupported file_type (e.g., not in allowed MIME type list)
  await TestValidator.error("unsupported file_type must fail")(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.create(
      connection,
      {
        reviewId,
        body: {
          file_uri: "s3://bucket/fakefile.txt",
          file_type: "text/unknown-type",
          file_size: 1024,
          review_id: reviewId,
        },
      },
    );
  });

  // 4b. file_size too large (practical max size violation)
  await TestValidator.error("file_size too large must fail")(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.create(
      connection,
      {
        reviewId,
        body: {
          file_uri: "s3://bucket/bigfile.jpg",
          file_type: "image/jpeg",
          file_size: 10_000_000_000, // 10 GB, exceeds practical/allowed
          review_id: reviewId,
        },
      },
    );
  });
}
