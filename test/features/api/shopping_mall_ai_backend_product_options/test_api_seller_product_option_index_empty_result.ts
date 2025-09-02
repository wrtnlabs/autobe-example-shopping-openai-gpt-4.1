import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import type { IPageIShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductOptions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_option_index_empty_result(
  connection: api.IConnection,
) {
  /**
   * Test that a product with no options returns an empty options result.
   *
   * Business scenario: A newly joined seller checks for product options before
   * configuring any. Since no product creation API is available, a random
   * product UUID is used as a placeholder. The endpoint should return an empty
   * data array and pagination metadata indicating zero records, ensuring the
   * endpoint's graceful handling of products with no options.
   *
   * Steps:
   *
   * 1. Seller joins (register as a new seller)
   * 2. Generate a random product ID (since actual product creation is unavailable)
   * 3. Call the product options index endpoint for the mock product ID
   * 4. Assert that the data array in the response is empty
   * 5. Assert that pagination records and pages are both zero
   */
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);

  // In the absence of a product-creation API, generate a synthetic product UUID
  const mockProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call product options index endpoint for this product
  const result =
    await api.functional.shoppingMallAiBackend.seller.products.options.index(
      connection,
      {
        productId: mockProductId,
        body: {},
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "options index data array should be empty",
    result.data,
    [],
  );
  TestValidator.equals(
    "pagination: records should be zero",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination: pages should be zero",
    result.pagination.pages,
    0,
  );
}
