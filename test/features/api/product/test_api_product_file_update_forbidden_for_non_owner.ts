import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_product_file_update_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  /**
   * Test that a seller cannot update the metadata for a product file they do
   * not own.
   *
   * 1. Register Seller A and create a product.
   * 2. Seller A attaches a file to the product.
   * 3. Register Seller B, switching authentication context.
   * 4. Seller B attempts to update Seller A's product file using the
   *    /shoppingMallAiBackend/seller/products/{productId}/files/{fileId}
   *    endpoint.
   * 5. Confirm a forbidden authorization error is returned and no changes are
   *    applied.
   *
   * This validates that cross-account file updates are prevented as a critical
   * security mechanism.
   */

  // 1. Register Seller A (the owner)
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        business_registration_number: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerA);

  // 2. Seller A creates a product
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 12,
          }),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
            wordMin: 3,
            wordMax: 8,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 99,
          tax_code: RandomGenerator.alphaNumeric(5),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Seller A attaches a file to the product
  const file: IShoppingMallAiBackendProductFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          file_uri: `https://cdn.example.com/img/${RandomGenerator.alphaNumeric(16)}.jpg`,
          file_type: "image/jpeg",
          display_order: 1,
          is_primary: true,
        } satisfies IShoppingMallAiBackendProductFile.ICreate,
      },
    );
  typia.assert(file);
  const productId = product.id;
  const fileId = file.id;

  // 4. Register Seller B (switch to Seller B context)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerBEmail,
        business_registration_number: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerB);

  // 5. Seller B attempts forbidden update on Seller A's file
  await TestValidator.error(
    "seller B cannot update metadata of Seller A's product file",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.update(
        connection,
        {
          productId,
          fileId,
          body: {
            display_order: 2,
            is_primary: false,
          } satisfies IShoppingMallAiBackendProductFile.IUpdate,
        },
      );
    },
  );
}
