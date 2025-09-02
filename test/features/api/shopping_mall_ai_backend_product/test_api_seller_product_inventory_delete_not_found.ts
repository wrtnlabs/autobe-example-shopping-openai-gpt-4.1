import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * Test deletion of a non-existent inventoryId as seller.
 *
 * This test validates that attempting to delete a product inventory entry,
 * which does not exist, returns a proper 404 error without affecting
 * legitimate data.
 *
 * Steps:
 *
 * 1. Register as a new seller to obtain authentication context.
 * 2. Create a valid seller-controlled product to establish product context.
 * 3. Attempt to delete a nonexistent inventoryId (random UUID), verifying
 *    correct error (404 Not Found).
 * 4. (Optional/Not Implementable) Product existence re-validation is skipped
 *    as getter is not in provided SDK.
 */
export async function test_api_seller_product_inventory_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new seller (and authenticate for session)
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert(sellerAuth);

  // 2. Create a valid product in the seller's context
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "inactive",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(4),
    sort_priority: typia.random<number>(),
  };
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Attempt deletion with a guaranteed-nonexistent inventoryId (random UUID)
  await TestValidator.httpError(
    "deleting nonexistent inventoryId responds with 404",
    404,
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.inventories.erase(
        connection,
        {
          productId: product.id,
          inventoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. (Optional check for product unchanged) - not implemented, as product read endpoint is unavailable.
}
