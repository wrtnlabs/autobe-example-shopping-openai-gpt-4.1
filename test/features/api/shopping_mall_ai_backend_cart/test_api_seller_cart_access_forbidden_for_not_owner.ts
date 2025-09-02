import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_seller_cart_access_forbidden_for_not_owner(
  connection: api.IConnection,
) {
  /**
   * Test that sellers cannot fetch carts not owned by themselves.
   *
   * Business workflow:
   *
   * 1. Register Seller A and authenticate (connection becomes Seller A)
   * 2. Seller A creates a cart (store cartId and verify response)
   * 3. Register Seller B and re-authenticate (connection context is now Seller B)
   * 4. Seller B attempts to access Seller A's cart by cartId
   * 5. Validate that Seller B receives an authorization or not found error (access
   *    forbidden)
   */

  // 1. Register Seller A and authenticate
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerARegNum: string = RandomGenerator.alphaNumeric(10);
  const sellerAName: string = RandomGenerator.name();
  const sellerAResult = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      business_registration_number: sellerARegNum,
      name: sellerAName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAResult);

  // 2. Seller A creates a cart
  const cartCreate: IShoppingMallAiBackendCart =
    await api.functional.shoppingMallAiBackend.seller.carts.create(connection, {
      body: {
        cart_token: RandomGenerator.alphaNumeric(16),
        status: "active",
      } satisfies IShoppingMallAiBackendCart.ICreate,
    });
  typia.assert(cartCreate);
  const cartId = cartCreate.id;

  // 3. Register Seller B and re-authenticate (switch context)
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBRegNum: string = RandomGenerator.alphaNumeric(10);
  const sellerBName: string = RandomGenerator.name();
  const sellerBResult = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      business_registration_number: sellerBRegNum,
      name: sellerBName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerBResult);

  // 4. Seller B attempts to fetch Seller A's cart (must be forbidden)
  await TestValidator.error(
    "non-owner seller cannot access another seller's cart",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.at(connection, {
        cartId: cartId,
      });
    },
  );
}
