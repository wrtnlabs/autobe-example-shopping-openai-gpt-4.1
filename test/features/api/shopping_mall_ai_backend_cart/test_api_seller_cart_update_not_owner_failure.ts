import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_seller_cart_update_not_owner_failure(
  connection: api.IConnection,
) {
  /**
   * Validates access control on shopping cart update between different sellers.
   *
   * 1. Register sellerA (first seller, owner of the cart)
   * 2. Create a cart as sellerA
   * 3. Register sellerB (second seller, NOT the owner)
   * 4. Attempt to update sellerA's cart while authenticated as sellerB
   * 5. Expect authorization error (+ confirm the cart is NOT changed if a GET
   *    endpoint is available)
   */

  // 1. Register sellerA
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerA);

  // 2. Create a cart as sellerA
  const createCart: IShoppingMallAiBackendCart =
    await api.functional.shoppingMallAiBackend.seller.carts.create(connection, {
      body: {
        cart_token: RandomGenerator.alphaNumeric(12),
        status: RandomGenerator.pick([
          "active",
          "submitted",
          "merged",
        ] as const),
        note: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallAiBackendCart.ICreate,
    });
  typia.assert(createCart);

  // Snapshot original cart for possible post-assertion (if GET existed)
  const originalCart = { ...createCart };

  // 3. Register sellerB (switch context)
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerB);

  // 4. Attempt update as sellerB (should fail: forbidden/unauthorized)
  await TestValidator.error(
    "sellerB cannot update a cart owned by sellerA",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.carts.update(
        connection,
        {
          cartId: createCart.id,
          body: {
            note: "Unauthorized update attempt",
          } satisfies IShoppingMallAiBackendCart.IUpdate,
        },
      );
    },
  );

  // 5. (Optional) Would verify cart unchanged here, but no GET cart API provided, so safely omit.
}
