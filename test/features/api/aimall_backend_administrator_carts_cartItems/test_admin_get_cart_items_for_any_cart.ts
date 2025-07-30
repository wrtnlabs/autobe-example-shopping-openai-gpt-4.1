import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IPageIAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate that an administrator can retrieve all cart items for any customer
 * cart.
 *
 * This E2E test covers the full workflow for cart item administration:
 *
 * 1. Register a new customer in the system.
 * 2. Create a cart for that customer (linked by customer_id).
 * 3. Add one or more items to the created cart as that customer.
 * 4. Retrieve the cart items via the admin endpoint using admin privileges.
 * 5. Verify that all details (product references, quantity, price, etc.) match the
 *    added items.
 *
 * This tests both data accessibility across roles (admin → customer data) and
 * correctness of returned cart item info (IDs and amounts).
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_index(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a cart for the new customer
  const cart: IAimallBackendCart =
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(cart);

  // 3. Add an item to the cart
  const cartItemInput: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 2,
    unit_price_snapshot: 12000,
    discount_snapshot: 1000,
    selected_name_display: "테스트상품명/옵션",
  };
  const cartItem: IAimallBackendCartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: cartItemInput,
      },
    );
  typia.assert(cartItem);

  // 4. Retrieve cart items as administrator (should see the item just added)
  const result =
    await api.functional.aimall_backend.administrator.carts.cartItems.index(
      connection,
      {
        cartId: cart.id,
      },
    );
  typia.assert(result);

  // 5. Verify the new item is present in the result data
  const found = result.data.find((item) => item.id === cartItem.id);
  TestValidator.predicate("cart item from admin endpoint matches added item")(
    !!found,
  );
  if (found) {
    TestValidator.equals("cart id matches")(found.aimall_backend_cart_id)(
      cart.id,
    );
    TestValidator.equals("product id matches")(found.aimall_backend_product_id)(
      cartItemInput.aimall_backend_product_id,
    );
    TestValidator.equals("quantity matches")(found.quantity)(
      cartItemInput.quantity,
    );
    TestValidator.equals("unit_price_snapshot matches")(
      found.unit_price_snapshot,
    )(cartItemInput.unit_price_snapshot);
    TestValidator.equals("discount_snapshot matches")(found.discount_snapshot)(
      cartItemInput.discount_snapshot,
    );
    TestValidator.equals("selected_name_display matches")(
      found.selected_name_display,
    )(cartItemInput.selected_name_display);
  } else {
    throw new Error("Admin endpoint did not return the added cart item");
  }
}
