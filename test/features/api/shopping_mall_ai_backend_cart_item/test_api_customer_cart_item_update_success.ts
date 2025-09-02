import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_customer_cart_item_update_success(
  connection: api.IConnection,
) {
  /**
   * Test successful update of a cart item by updating its quantity and
   * option_code for the authenticated customer.
   *
   * 1. Customer account registration and automatic authentication (token is set in
   *    connection.headers.Authorization).
   * 2. Create a new cart associated with the registered customer by supplying a
   *    random, unique cart_token and 'active' status.
   * 3. Add an item to the cart—it must include a valid product snapshot ID,
   *    quantity at least 1, and an initial option_code.
   * 4. Update the cart item, changing its quantity and option_code.
   * 5. Validate the result:
   *
   *    - The response must reflect the new quantity and option_code exactly as sent.
   *    - The quantity must remain at least 1.
   *    - The option_code must match the new value.
   *    - All returned fields must continue to satisfy their TypeScript types and
   *         business constraints.
   */
  // Step 1: Customer registration & authentication
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAuth);

  // Step 2: Create a cart for this customer
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_ai_backend_customer_id: customerAuth.customer.id,
        cart_token: RandomGenerator.alphaNumeric(16),
        status: "active",
        // optional fields left undefined
      } satisfies IShoppingMallAiBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Add an item to the cart (random product snapshot, random option code, quantity 1)
  const initialItemInput: IShoppingMallAiBackendCartItem.ICreate = {
    shopping_mall_ai_backend_cart_id: cart.id,
    shopping_mall_ai_backend_product_snapshot_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    quantity: 1,
    option_code: RandomGenerator.alphaNumeric(8),
  };
  const initialItem =
    await api.functional.shoppingMallAiBackend.customer.carts.items.create(
      connection,
      {
        cartId: cart.id,
        body: initialItemInput,
      },
    );
  typia.assert(initialItem);
  TestValidator.equals(
    "initial cart item quantity is 1",
    initialItem.quantity,
    1,
  );
  TestValidator.equals(
    "initial cart item option_code matches",
    initialItem.option_code,
    initialItemInput.option_code,
  );

  // Step 4: Update the item with a new quantity and option code
  const updateInput: IShoppingMallAiBackendCartItem.IUpdate = {
    quantity: 2,
    option_code: RandomGenerator.alphaNumeric(10),
    note: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedItem =
    await api.functional.shoppingMallAiBackend.customer.carts.items.update(
      connection,
      {
        cartId: cart.id,
        itemId: initialItem.id,
        body: updateInput,
      },
    );
  typia.assert(updatedItem);

  // Step 5: Assert the update results
  TestValidator.equals(
    "cart item quantity updated",
    updatedItem.quantity,
    updateInput.quantity,
  );
  TestValidator.equals(
    "cart item option_code updated",
    updatedItem.option_code,
    updateInput.option_code,
  );
  TestValidator.predicate(
    "cart item quantity is at least 1 after update",
    updatedItem.quantity >= 1,
  );
}
