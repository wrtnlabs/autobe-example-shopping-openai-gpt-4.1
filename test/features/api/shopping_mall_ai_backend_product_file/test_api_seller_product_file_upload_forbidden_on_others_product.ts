import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_seller_product_file_upload_forbidden_on_others_product(
  connection: api.IConnection,
) {
  /**
   * Verify that a seller is forbidden from uploading a file to a product they
   * do not own.
   *
   * Business Context: In a shopping mall AI backend, only the owning seller can
   * upload files to their product. This test enforces ownership restrictions by
   * confirming that a seller cannot upload attachments to another seller's
   * product. Violations must trigger a permission/authorization error.
   *
   * Process:
   *
   * 1. Register and log in as Seller A
   * 2. Seller A creates a product
   * 3. Register and log in as Seller B (context switch)
   * 4. Seller B attempts to upload a file to Seller A's product
   * 5. Confirm that an authorization error is thrown (ownership enforcement)
   */

  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAData: IShoppingMallAiBackendSeller.ICreate = {
    email: sellerAEmail,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const authA = await api.functional.auth.seller.join(connection, {
    body: sellerAData,
  });
  typia.assert(authA);
  const sellerAId = typia.assert(authA.seller.id);

  // 2. Seller A creates a product
  const productAData: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 1,
  };
  const productA =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productAData },
    );
  typia.assert(productA);
  const productAId = typia.assert(productA.id);

  // 3. Register Seller B (context switch)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBData: IShoppingMallAiBackendSeller.ICreate = {
    email: sellerBEmail,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const authB = await api.functional.auth.seller.join(connection, {
    body: sellerBData,
  });
  typia.assert(authB);

  // 4. Seller B attempts to upload a file to Seller A's product
  const filePayload: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: productAId,
    file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
    file_type: "image/jpeg",
    display_order: 1,
    is_primary: true,
  };

  // 5. Confirm authorization error
  await TestValidator.error(
    "Seller B forbidden: cannot upload file to another seller's product (ownership enforcement)",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.create(
        connection,
        {
          productId: productAId,
          body: filePayload,
        },
      );
    },
  );
}
