import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Verify that an administrator can successfully retrieve a cart item detail by
 * valid cartId and cartItemId.
 *
 * This test ensures that admin privilege allows accessing any cart item details
 * system-wide, even if the cart is customer-owned. The workflow provisions a
 * new customer, creates an associated cart for that customer, inserts an item
 * into that cart, and finally uses the admin endpoint to query that exact cart
 * item.
 *
 * Steps:
 *
 * 1. Create a test customer (required for cart and item ownership).
 * 2. Create a cart for the customer via /aimall-backend/customer/carts.
 * 3. Add a cart item to that cart, capturing the cartItemId.
 * 4. As administrator, fetch the cart item details using
 *    /aimall-backend/administrator/carts/{cartId}/cartItems/{cartItemId}.
 * 5. Assert all fields in the response are present and match the state after
 *    creation.
 * 6. Confirm proper admin access (no forbidden error etc.).
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_getByCartidAndCartitemid(
  connection: api.IConnection,
) {
  // 1. Create a test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create a cart for the customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // 3. Add a cart item to that cart
  const cartItemInput = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    aimall_backend_product_option_id: null,
    aimall_backend_sku_id: null,
    quantity: 2,
    unit_price_snapshot: 5000,
    discount_snapshot: 500,
    selected_name_display: "Test Product Option Name",
  } satisfies IAimallBackendCartItem.ICreate;
  const cartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: cartItemInput,
      },
    );
  typia.assert(cartItem);

  // 4. Retrieve the cart item as administrator
  const adminReadItem =
    await api.functional.aimall_backend.administrator.carts.cartItems.at(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
      },
    );
  typia.assert(adminReadItem);

  // 5. Assert all fields match between create and admin fetch
  TestValidator.equals("cart ID matches")(adminReadItem.aimall_backend_cart_id)(
    cart.id,
  );
  TestValidator.equals("item ID matches")(adminReadItem.id)(cartItem.id);
  TestValidator.equals("product ID matches")(
    adminReadItem.aimall_backend_product_id,
  )(cartItemInput.aimall_backend_product_id);
  TestValidator.equals("quantity matches")(adminReadItem.quantity)(
    cartItemInput.quantity,
  );
  TestValidator.equals("unit price snapshot matches")(
    adminReadItem.unit_price_snapshot,
  )(cartItemInput.unit_price_snapshot);
  TestValidator.equals("discount snapshot matches")(
    adminReadItem.discount_snapshot,
  )(cartItemInput.discount_snapshot);
  TestValidator.equals("selected name display matches")(
    adminReadItem.selected_name_display,
  )(cartItemInput.selected_name_display);
  TestValidator.equals("created at not null")(
    typeof adminReadItem.created_at === "string",
  )(true);
  TestValidator.equals("updated at not null")(
    typeof adminReadItem.updated_at === "string",
  )(true);
  // Option/SKU IDs should match null
  TestValidator.equals("product option id matches")(
    adminReadItem.aimall_backend_product_option_id,
  )(cartItemInput.aimall_backend_product_option_id);
  TestValidator.equals("SKU id matches")(adminReadItem.aimall_backend_sku_id)(
    cartItemInput.aimall_backend_sku_id,
  );
}
