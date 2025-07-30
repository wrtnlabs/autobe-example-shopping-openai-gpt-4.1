import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that an administrator can view all attachments of a review.
 *
 * This test creates a product and a customer, then as the customer leaves a
 * review for the product. Several attachments are added to the review using the
 * customer endpoint. Finally, the administrator retrieves all the attachments
 * for that review to ensure they're correctly present and schema-compliant.
 *
 * Steps:
 *
 * 1. Register a customer who will write a review.
 * 2. Create a seller product.
 * 3. The customer submits a review for the product.
 * 4. The customer adds several attachments to the review.
 * 5. As the administrator, fetch all attachments for the review and validate
 *    correctness and presence.
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_get_all_review_attachments_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Create a product (simulate seller context for seller_id)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerId,
    title: typia.random<string>(),
    status: "active",
    // Optionally add description and main_thumbnail_uri
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Register a review as the customer (simulate login by assumption)
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: typia.random<string>(),
    body: typia.random<string>(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 4. Add several attachments to the review
  const attachments = await ArrayUtil.asyncRepeat(3)(async () => {
    const attInput: IAimallBackendAttachment.ICreate = {
      review_id: review.id,
      file_uri: typia.random<string>(),
      file_type: "image/png",
      file_size: typia.random<number & tags.Type<"int32">>(),
    };
    return await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attInput,
      },
    );
  });
  attachments.forEach((a) => typia.assert(a));

  // 5. Fetch attachments as administrator
  const result =
    await api.functional.aimall_backend.administrator.reviews.attachments.index(
      connection,
      { reviewId: review.id },
    );
  typia.assert(result);

  // Validate: at least as many attachments as created are present in admin result
  TestValidator.predicate("all uploaded attachments should be present")(
    (result.data ?? []).length >= 3,
  );

  // Validate: each uploaded file_uri exists in the admin-fetched data
  for (const uploaded of attachments) {
    const match = (result.data ?? []).find(
      (item) =>
        item.file_uri === uploaded.file_uri &&
        item.file_size === uploaded.file_size &&
        item.file_type === uploaded.file_type,
    );
    TestValidator.predicate(
      "uploaded attachment is listed in admin attachments",
    )(!!match);
  }
}
