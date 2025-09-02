import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_product_file_delete_forbidden_non_owner(
  connection: api.IConnection,
) {
  /**
   * Test that a seller cannot delete a product file they do not own (ownership
   * enforcement).
   *
   * 1. Register Seller A (who owns the product/file): generates unique
   *    email/business_registration_number
   * 2. Seller A creates a product (plausible details)
   * 3. Seller A attaches a file to the product (generates realistic file_uri,
   *    marks as primary)
   * 4. Register Seller B (distinct credentials)
   * 5. Seller B (now authenticated) attempts to delete Seller A's product file
   * 6. Expect a business logic/authorization error from the API (forbidden
   *    operation)
   *
   * Note: No endpoint is provided to verify file existence post-attempt; thus,
   * validation is limited to error capture.
   */

  // 1. Register Seller A (real owner)
  const sellerA_email = typia.random<string & tags.Format<"email">>();
  const sellerA_regNum = RandomGenerator.alphaNumeric(8);
  const sellerA_name = RandomGenerator.name();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerA_email,
      business_registration_number: sellerA_regNum,
      name: sellerA_name,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerA);

  // 2. Seller A creates a product
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 10,
          }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(4),
          sort_priority: 0,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Seller A adds a file to the product
  const file =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_ai_backend_products_id: product.id,
          file_uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.jpg`,
          file_type: "image/jpeg",
          display_order: 0,
          is_primary: true,
        } satisfies IShoppingMallAiBackendProductFile.ICreate,
      },
    );
  typia.assert(file);

  // 4. Register Seller B (attacker, non-owner)
  const sellerB_email = typia.random<string & tags.Format<"email">>();
  const sellerB_regNum = RandomGenerator.alphaNumeric(8);
  const sellerB_name = RandomGenerator.name();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerB_email,
      business_registration_number: sellerB_regNum,
      name: sellerB_name,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerB);

  // 5/6. Seller B attempts to delete Seller A's product file
  await TestValidator.error(
    "Seller B is forbidden from deleting Seller A's product file",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.erase(
        connection,
        {
          productId: product.id,
          fileId: file.id,
        },
      );
    },
  );
}
