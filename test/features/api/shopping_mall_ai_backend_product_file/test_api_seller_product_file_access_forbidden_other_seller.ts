import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_seller_product_file_access_forbidden_other_seller(
  connection: api.IConnection,
) {
  /**
   * This function tests resource-level access control for product file records.
   * Specifically, it ensures that a seller cannot access files belonging to
   * products they do not own.
   *
   * 1. Register Seller A and obtain their authentication context.
   * 2. As Seller A, create a product.
   * 3. As Seller A, attach a file to this product.
   * 4. Register Seller B, which switches authentication context to Seller B.
   * 5. As Seller B, try to access the file uploaded by Seller A using
   *    productId/fileId.
   * 6. Assert that an authorization error is thrown and no file information is
   *    leaked.
   */

  // Step 1: Register Seller A
  const sellerA_data = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  const sellerA_auth = await api.functional.auth.seller.join(connection, {
    body: sellerA_data,
  });
  typia.assert(sellerA_auth);
  // after this, connection.headers.Authorization is set to Seller A's token

  // Step 2: Create product as Seller A
  const product_body = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;

  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: product_body },
    );
  typia.assert(product);

  // Step 3: Upload file to Seller A's product
  const file_body = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    file_type: "image/png",
    display_order: 1,
    is_primary: true,
  } satisfies IShoppingMallAiBackendProductFile.ICreate;
  const file =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      {
        productId: product.id,
        body: file_body,
      },
    );
  typia.assert(file);

  // Step 4: Register Seller B, automatically switching context
  const sellerB_data = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerB_auth = await api.functional.auth.seller.join(connection, {
    body: sellerB_data,
  });
  typia.assert(sellerB_auth);
  // connection.headers.Authorization is now Seller B

  // Step 5: Attempt to access Seller A's file as Seller B - expect authorization error
  await TestValidator.error(
    "Seller B cannot access other seller's product file",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.at(
        connection,
        {
          productId: product.id,
          fileId: file.id,
        },
      );
    },
  );
}
