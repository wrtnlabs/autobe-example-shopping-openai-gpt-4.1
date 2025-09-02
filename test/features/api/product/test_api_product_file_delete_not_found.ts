import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * Test deleting a non-existent file from a product as a seller.
 *
 * 1. Register a new seller (obtain authentication so that seller role is
 *    established)
 * 2. Create a new product using the registered seller
 * 3. DO NOT upload any files to the product (so there are zero files attached)
 * 4. Generate a random UUID as fileId (which is guaranteed to not exist on the
 *    product)
 * 5. Attempt to delete this fileId via the DELETE
 *    /shoppingMallAiBackend/seller/products/{productId}/files/{fileId}
 *    endpoint
 * 6. Assert that an error is thrown (must NOT succeed)
 * 7. If possible, confirm that the product state (files) remains unchanged
 *
 * Rationale: This validates that the API correctly rejects deletion of
 * non-existent file references and enforces integrity, returning an error
 * instead of silently succeeding or causing unintended data changes.
 */
export async function test_api_product_file_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  const sellerJoinResult = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerJoinResult);

  // 2. Create a new product as the seller
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 2,
      wordMax: 8,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "subscription",
    ] as const),
    business_status: RandomGenerator.pick(["active", "draft"] as const),
    min_order_quantity: 1,
    max_order_quantity: 5,
    tax_code: RandomGenerator.alphaNumeric(8),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const createdProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(createdProduct);

  // 3. No files attached to the product (by plan)

  // 4. Generate a non-existent random UUID for fileId
  const fakeFileId = typia.random<string & tags.Format<"uuid">>();

  // 5 & 6. Attempt to delete with invalid fileId – should fail
  await TestValidator.error(
    "Deleting a nonexistent file from product should fail with error",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.erase(
        connection,
        {
          productId: createdProduct.id,
          fileId: fakeFileId,
        },
      );
    },
  );
}
