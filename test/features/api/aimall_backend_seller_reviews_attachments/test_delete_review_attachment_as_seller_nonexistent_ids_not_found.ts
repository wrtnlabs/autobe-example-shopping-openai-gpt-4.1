import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate NOT-FOUND error for deleting review attachment with non-existent IDs
 * as seller
 *
 * This test ensures that when a seller attempts to delete a review attachment
 * by using fake (non-existent) reviewId and/or attachmentId, the API properly
 * returns a not-found error and does not succeed. We ensure a valid seller
 * context by creating a product first (though the IDs being tested for deletion
 * will be random and not related to the newly created product).
 *
 * 1. Create a valid product as seller for context (not used for ids in delete
 *    operation)
 * 2. Attempt to delete a review attachment using random UUIDs for both reviewId
 *    and attachmentId
 *
 *    - Expect a not-found error to be thrown by the API
 *
 * Business rules: Only users with proper permissions can call this endpoint,
 * but the main concern here is the behavior for missing resource IDs (404).
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_delete_review_attachment_as_seller_nonexistent_ids_not_found(
  connection: api.IConnection,
) {
  // 1. Create a product as seller for valid session context
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
        main_thumbnail_uri: RandomGenerator.alphaNumeric(30),
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Attempt to delete a non-existent attachment from a non-existent review
  await TestValidator.error(
    "should return not-found for non-existent reviewId and attachmentId",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.erase(
      connection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
