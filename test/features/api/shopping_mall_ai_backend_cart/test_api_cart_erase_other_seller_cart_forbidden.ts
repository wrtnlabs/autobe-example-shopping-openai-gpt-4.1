import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_cart_erase_other_seller_cart_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validate that sellers cannot delete carts owned by other sellers.
   *
   * Steps:
   *
   * 1. Register Seller A (establish context for cart ownership).
   * 2. As Seller A, create a new shopping cart and store its ID.
   * 3. Register Seller B (context switches to Seller B).
   * 4. As Seller B, attempt to erase (soft delete) the cart belonging to Seller A.
   * 5. Assert that the delete operation fails with authorization or not found
   *    error.
   */

  // 1. Register Seller A
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerABizNum: string = RandomGenerator.alphaNumeric(10);
  const sellerAName: string = RandomGenerator.name();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      business_registration_number: sellerABizNum,
      name: sellerAName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerA);

  // 2. Seller A creates a cart
  const cartA = await api.functional.shoppingMallAiBackend.seller.carts.create(
    connection,
    {
      body: {
        cart_token: RandomGenerator.alphaNumeric(20),
        status: "active",
      } satisfies IShoppingMallAiBackendCart.ICreate,
    },
  );
  typia.assert(cartA);

  // 3. Register Seller B (context switches to Seller B)
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBBizNum: string = RandomGenerator.alphaNumeric(10);
  const sellerBName: string = RandomGenerator.name();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      business_registration_number: sellerBBizNum,
      name: sellerBName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerB);

  // 4. Seller B tries to erase Seller A's cart
  await TestValidator.error(
    "seller cannot delete another seller's cart (should be forbidden or not found)",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.erase(
        connection,
        {
          cartId: cartA.id,
        },
      );
    },
  );
}
