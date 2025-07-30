import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate unauthorized access control for updating cart items.
 *
 * This test ensures access control policies are enforced when updating cart
 * items – specifically, only the cart’s owner or an administrator should be
 * able to update a cart item. Any unauthorized request (such as one from an
 * unauthenticated or unrelated user) must be denied with a 403 forbidden or
 * similar error response.
 *
 * Steps:
 *
 * 1. Register a new customer (owner of the cart).
 * 2. Create a cart for that customer as administrator.
 * 3. Add a cart item to the cart (admin context).
 * 4. Attempt to update the cart item using an unauthorized connection (simulate
 *    unauthenticated/incorrect user).
 * 5. Assert that update fails with an authorization error (e.g., HTTP 403
 *    Forbidden).
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_update_cart_item_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a new customer (cart owner)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(20),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a new cart for the customer as admin
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Add a cart item to the cart (admin context)
  const cartItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          unit_price_snapshot: 10000,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 4. Attempt to update the cart item as unauthorized (simulate unauthenticated or unrelated user)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("should deny update from unauthorized user")(() =>
    api.functional.aimall_backend.administrator.carts.cartItems.update(
      unauthorizedConnection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: {
          quantity: 2,
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendCartItem.IUpdate,
      },
    ),
  );
}
