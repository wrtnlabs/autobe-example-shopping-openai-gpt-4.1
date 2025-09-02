import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import type { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_cart_items_index_denied_for_other_customer_cart(
  connection: api.IConnection,
) {
  /**
   * Ensures that a customer cannot enumerate the items of another customer's
   * shopping cart, enforcing strict data isolation at the API level.
   *
   * Steps:
   *
   * 1. Register customer A and authenticate as A.
   * 2. Have customer A create a cart and add an item.
   * 3. Register customer B (which switches the authentication context to B).
   * 4. Attempt to list items in customer A's cart as B (must fail with forbidden
   *    or not found).
   *
   * Validates that cart items cannot be viewed by any user except the owning
   * customer.
   */

  // 1. Register customer A and authenticate
  const joinA = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinA);
  const customerA = joinA.customer;

  // 2. Customer A creates a cart
  const cartA =
    await api.functional.shoppingMallAiBackend.customer.carts.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerA.id,
          cart_token: RandomGenerator.alphaNumeric(16),
          status: "active",
          note: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAiBackendCart.ICreate,
      },
    );
  typia.assert(cartA);

  // 3. Customer A adds an item to their cart
  const itemA =
    await api.functional.shoppingMallAiBackend.customer.carts.items.create(
      connection,
      {
        cartId: cartA.id,
        body: {
          shopping_mall_ai_backend_cart_id: cartA.id,
          shopping_mall_ai_backend_product_snapshot_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          option_code: RandomGenerator.alphaNumeric(8),
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAiBackendCartItem.ICreate,
      },
    );
  typia.assert(itemA);

  // 4. Register customer B (switching context to B)
  const joinB = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinB);

  // 5. As customer B, attempt to list items in customer A's cart (must be forbidden or not found)
  await TestValidator.error(
    "customer B cannot index items in customer A's cart",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.items.index(
        connection,
        {
          cartId: cartA.id,
          body: {},
        },
      );
    },
  );
}
