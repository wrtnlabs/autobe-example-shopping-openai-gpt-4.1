import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_seller_product_option_delete_not_found_failure(
  connection: api.IConnection,
) {
  /**
   * Test that deleting a non-existent or already deleted product option group
   * returns an appropriate not found or business logic error.
   *
   * Steps:
   *
   * 1. Register a new seller (fresh authentication and context).
   * 2. Create a new product as that seller.
   * 3. Attempt to delete a product option group with a random UUID, ensuring this
   *    option group does not exist under the product.
   * 4. Assert that a business logic error or not found error is thrown by the API.
   *
   * This verifies that the erase endpoint enforces not-found/business
   * constraints for option groups and prevents deleting non-existent or
   * unrelated options.
   */

  // 1. Register seller for authentication context
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Create a product as the seller
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: "VAT10",
    sort_priority: 10,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Attempt deletion of a non-existent option group
  await TestValidator.error(
    "deleting non-existent product option group should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.erase(
        connection,
        {
          productId: product.id,
          optionId: typia.random<string & tags.Format<"uuid">>(), // guaranteed non-existent
        },
      );
    },
  );
}
