import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validates that an administrator can delete a specific cart item from any
 * user's cart.
 *
 * This test covers admin capabilities for managing carts across users in the
 * system. It ensures that:
 *
 * - The admin can create a customer and a cart on behalf of any customer
 * - The admin can add cart items to the created cart
 * - The admin can delete a specific cart item by ID
 * - After deletion, the removed item cannot be found in affected listings/queries
 *   This supports business logic for admin-driven troubleshooting, UX support,
 *   and system auditability.
 *
 * Steps:
 *
 * 1. Register a new customer (backend creation)
 * 2. As admin, create a cart for the customer
 * 3. As admin, add a cart item to the newly created cart
 * 4. As admin, delete the cart item with the correct cartId and cartItemId
 * 5. Confirm the cart item is deleted (by attempting a second delete, expecting an
 *    error)
 */
export async function test_api_aimall_backend_test_admin_deletes_cart_item_successfully(
  connection: api.IConnection,
) {
  // 1. Register a new customer in the system
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(30),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Admin creates a cart linked to the above customer
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Admin adds a cart item to this cart (simulate a product/option/SKU)
  const cartItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          aimall_backend_product_option_id: null,
          aimall_backend_sku_id: null,
          quantity: 1,
          unit_price_snapshot: 10000,
          discount_snapshot: null,
          selected_name_display: "Test Product Option",
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 4. Admin deletes the cart item by cartId and cartItemId
  await api.functional.aimall_backend.administrator.carts.cartItems.erase(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
    },
  );

  // 5. Optionally, attempt to delete again -- should throw (the item should not exist)
  await TestValidator.error("item already removed or does not exist")(() =>
    api.functional.aimall_backend.administrator.carts.cartItems.erase(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
      },
    ),
  );
}
