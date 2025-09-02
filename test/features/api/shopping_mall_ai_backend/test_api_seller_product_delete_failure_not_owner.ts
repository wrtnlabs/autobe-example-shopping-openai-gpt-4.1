import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_product_delete_failure_not_owner(
  connection: api.IConnection,
) {
  /**
   * Test failure when a seller attempts to delete another seller's product.
   *
   * 1. Register SellerA with random information.
   * 2. (Product creation by SellerA is not possible since no product registration
   *    API is present.) Generate a random productId to simulate a product
   *    belonging to SellerA.
   * 3. Register SellerB with random information (switch context to SellerB).
   * 4. Attempt to delete the productId as SellerB using DELETE
   *    /shoppingMallAiBackend/seller/products/{productId}.
   * 5. Confirm deletion fails with an authorization error (business logic
   *    protection).
   */

  // 1. Register SellerA
  const sellerA: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        business_registration_number: RandomGenerator.alphaNumeric(13),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerA);

  // 2. Simulate SellerA's product by generating a random UUID
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Register SellerB (switch context)
  const sellerB: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        business_registration_number: RandomGenerator.alphaNumeric(13),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerB);

  // 4 & 5. Attempt delete as SellerB, expect authorization error
  await TestValidator.error(
    "seller cannot delete another seller's product",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.erase(
        connection,
        {
          productId,
        },
      );
    },
  );
}
