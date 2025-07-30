import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate error handling when updating a cart item with a non-existent
 * cartItemId as administrator.
 *
 * Business context: Admins are allowed to update cart items for carts owned by
 * customers. If a cartItemId is specified that does not exist in the cart, the
 * system must respond with a 404 Not Found error, not with silent failure or
 * wrong success. This prevents accidental updates to wrong or missing records,
 * and upholds data integrity in administrative scenarios.
 *
 * Steps:
 *
 * 1. Create a customer (so we have a valid customer to associate with the cart).
 * 2. Create a cart associated with the customer to get a valid cartId.
 * 3. Attempt to update a cart item with a valid cartId but a clearly invalid/fake
 *    cartItemId (such as a new random UUID).
 * 4. Validate that the response is a 404 Not Found error (TestValidator.error with
 *    proper error type).
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_update_cart_item_with_invalid_cart_item_id(
  connection: api.IConnection,
) {
  // 1. Create a customer, which is required for associating with the cart
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a cart owned by the above customer
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Attempt to update a cart item with a non-existent cartItemId (random UUID)
  const fakeCartItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent cart item returns 404 error",
  )(
    async () =>
      await api.functional.aimall_backend.administrator.carts.cartItems.update(
        connection,
        {
          cartId: cart.id,
          cartItemId: fakeCartItemId,
          body: {
            quantity: 2,
            updated_at: new Date().toISOString(),
          } satisfies IAimallBackendCartItem.IUpdate,
        },
      ),
  );
}
