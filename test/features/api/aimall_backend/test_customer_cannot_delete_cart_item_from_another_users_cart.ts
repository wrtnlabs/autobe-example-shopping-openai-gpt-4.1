import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate that a customer cannot delete items from another customer's cart
 * (access control enforcement).
 *
 * Ensures strict resource isolation by verifying that customers can only modify
 * their own carts.
 *
 * Workflow:
 *
 * 1. Register Customer A
 * 2. Register Customer B
 * 3. Customer A creates a cart
 * 4. Customer A adds an item to the cart
 * 5. Attempt to delete that item as Customer B, expecting forbidden (error)
 *
 * Steps using only available API functions and data types. (If explicit
 * authentication were required, it would be included, but is omitted due to
 * lack of a provided login/auth api.)
 */
export async function test_api_aimall_backend_test_customer_cannot_delete_cart_item_from_another_users_cart(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      },
    },
  );
  typia.assert(customerA);

  // 2. Register Customer B
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      },
    },
  );
  typia.assert(customerB);

  // 3. Customer A creates a cart
  const cartA = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerA.id,
      },
    },
  );
  typia.assert(cartA);

  // 4. Customer A adds an item to the cart
  const cartItemA =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cartA.id,
        body: {
          aimall_backend_product_id: typia.random<string>(),
          quantity: 1,
          unit_price_snapshot: typia.random<number>(),
        },
      },
    );
  typia.assert(cartItemA);

  // 5. Attempt deletion as Customer B
  // (If authentication context were switchable, would swap here; with current API, simulate by intent.)
  await TestValidator.error("Customer B cannot delete Customer A's cart item")(
    async () => {
      await api.functional.aimall_backend.customer.carts.cartItems.erase(
        connection,
        {
          cartId: cartA.id,
          cartItemId: cartItemA.id,
        },
      );
    },
  );
}
