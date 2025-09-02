import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_update_not_found_failure(
  connection: api.IConnection,
) {
  /**
   * Test that updating a non-existent product option group fails as expected.
   *
   * This test ensures robust resource integrity enforcement in the product
   * option update API:
   *
   * 1. Registers a seller for authentication context (prerequisite for subsequent
   *    product operations).
   * 2. Creates a new product to provide a valid context for the update attempt
   *    (obtains the definitive productId).
   * 3. Attempts to update a product option group by providing a random
   *    (non-existent) optionId for the valid product.
   * 4. The system should respond with an appropriate not found (404) or domain
   *    error – never wrongly succeed or create a ghost record.
   *
   * Steps:
   *
   * - Enforces authentication flow and product creation as real business
   *   prerequisites.
   * - Validates error handling and referential integrity for the update endpoint.
   */

  // 1. Register and authenticate seller
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Create a product as this seller
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: typia.random<number & tags.Type<"int32">>(),
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Attempt to update a non-existent option group in this product
  const nonExistentOptionId = typia.random<string & tags.Format<"uuid">>();
  const updateInput: IShoppingMallAiBackendProductOptions.IUpdate = {
    option_name: RandomGenerator.paragraph({ sentences: 2 }),
    required: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  };
  await TestValidator.error(
    "update should fail for non-existent option group",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.update(
        connection,
        {
          productId: product.id,
          optionId: nonExistentOptionId,
          body: updateInput,
        },
      );
    },
  );
}
