import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Test that a customer can add a new cart item to their own cart and validate
 * all required properties.
 *
 * This test verifies that a customer can:
 *
 * 1. Register successfully.
 * 2. Create a cart assigned to their account.
 * 3. Add a new product as a cart item (including all required and some optional
 *    fields) to their cart.
 * 4. Confirm the created cart item has accurate references and values as supplied.
 *
 * Workflow:
 *
 * 1. Register a new customer using unique input data.
 * 2. Create a shopping cart associated with that customer.
 * 3. Add a cart item with all necessary atomic info (product id, quantity, price,
 *    display text, and null for optional fields).
 * 4. Validate all properties on the response to confirm persistence and data
 *    integrity.
 *
 * Limitations: Does not retrieve the cart item again after creation (no such
 * SDK available). Only validates creation response.
 */
export async function test_api_aimall_backend_customer_carts_cartItems_test_add_cart_item_successful_add_for_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Create a cart for the customer
  const cartInput: IAimallBackendCart.ICreate = {
    aimall_backend_customer_id: customer.id,
  };
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: cartInput,
    },
  );
  typia.assert(cart);

  // 3. Add a cart item to the customer's cart
  const productId = typia.random<string & tags.Format<"uuid">>();
  const cartItemInput: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: productId,
    quantity: 2,
    unit_price_snapshot: 10000,
    aimall_backend_product_option_id: null,
    aimall_backend_sku_id: null,
    discount_snapshot: null,
    selected_name_display: "Test Product Display Name",
  };
  const cartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: cartItemInput,
      },
    );
  typia.assert(cartItem);

  // 4. Validate cart item response fields for correctness
  TestValidator.equals("cart item product ID")(
    cartItem.aimall_backend_product_id,
  )(productId);
  TestValidator.equals("cart reference")(cartItem.aimall_backend_cart_id)(
    cart.id,
  );
  TestValidator.equals("quantity")(cartItem.quantity)(2);
  TestValidator.equals("unit price")(cartItem.unit_price_snapshot)(10000);
  TestValidator.equals("display name")(cartItem.selected_name_display)(
    "Test Product Display Name",
  );
  TestValidator.equals("option ID is null")(
    cartItem.aimall_backend_product_option_id,
  )(null);
  TestValidator.equals("sku ID is null")(cartItem.aimall_backend_sku_id)(null);
  TestValidator.equals("discount is null")(cartItem.discount_snapshot)(null);
}
