import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Test successful update of a customer-owned shopping cart.
 *
 * 1. Register a new customer using /auth/customer/join to establish
 *    authentication.
 * 2. As the authenticated customer, create a cart using
 *    /shoppingMallAiBackend/customer/carts.
 * 3. Update the cart using /shoppingMallAiBackend/customer/carts/{cartId}
 *    (PUT) to change fields like note and status.
 * 4. Assert that the returned cart reflects the new values for note and status
 *    and that updated_at has changed.
 * 5. Ensure only allowed fields were updated and the cart remains owned by the
 *    original customer. Validate non-updated fields (like cart_token)
 *    remain unchanged.
 * 6. All API responses should be type-asserted and business logic validated
 *    with descriptive TestValidator titles.
 */
export async function test_api_customer_cart_update_success(
  connection: api.IConnection,
) {
  // 1. Register new customer (join)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Create a cart for the authenticated customer
  const createInput: IShoppingMallAiBackendCart.ICreate = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    cart_token: RandomGenerator.alphaNumeric(20),
    status: "active",
    note: "Initial note",
  };
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    { body: createInput },
  );
  typia.assert(cart);

  // 3. Update the cart - change note and status
  const updateInput: IShoppingMallAiBackendCart.IUpdate = {
    note: "Updated the note for test validation.",
    status: "submitted",
  };
  const updatedCart =
    await api.functional.shoppingMallAiBackend.customer.carts.update(
      connection,
      {
        cartId: cart.id,
        body: updateInput,
      },
    );
  typia.assert(updatedCart);

  // 4. Validation of updated fields
  TestValidator.equals("cart note updated", updatedCart.note, updateInput.note);
  TestValidator.equals(
    "cart status updated",
    updatedCart.status,
    updateInput.status,
  );
  TestValidator.equals(
    "cart ownership maintained",
    updatedCart.shopping_mall_ai_backend_customer_id,
    cart.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.notEquals(
    "cart updated_at changed after update",
    updatedCart.updated_at,
    cart.updated_at,
  );
  TestValidator.equals("cart id unchanged", updatedCart.id, cart.id);

  // 5. Validation of non-updated fields
  TestValidator.equals(
    "cart_token unchanged after update",
    updatedCart.cart_token,
    cart.cart_token,
  );
  TestValidator.equals(
    "cart created_at unchanged",
    updatedCart.created_at,
    cart.created_at,
  );
}
