import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate retrieval of details for a specific cart item belonging to a
 * customer.
 *
 * This test verifies that when a customer creates an account, registers a cart,
 * and adds a cart item, they can subsequently retrieve the full set of details
 * for that cart item by providing correct cartId and cartItemId. The response
 * is checked to ensure all atomic fields, relationships, and values exactly
 * match the source of creation.
 *
 * Step-by-step business process:
 *
 * 1. Register a new customer (with mandatory fields).
 * 2. Create a shopping cart for that customer—capture generated cartId.
 * 3. Add a cart item to the cart with specific test values—capture cartItemId.
 * 4. Retrieve the cart item via GET
 *    /aimall-backend/customer/carts/{cartId}/cartItems/{cartItemId}.
 * 5. Assert all returned fields in the payload exactly match the earlier created
 *    cart item including all atomic/relationship fields.
 */
export async function test_api_aimall_backend_test_get_cart_item_detail_with_valid_id_for_customer_owned_cart(
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
        password_hash: null, // For this test, registration without password
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a shopping cart for the customer
  const cart: IAimallBackendCart =
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(cart);

  // 3. Add a cart item to the cart
  const cartItemInput: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    aimall_backend_product_option_id: null,
    aimall_backend_sku_id: null,
    quantity: 2,
    unit_price_snapshot: 33000,
    discount_snapshot: 2000,
    selected_name_display: "Test automation product [L, blue]",
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

  // 4. Retrieve the cart item via GET endpoint
  const detail: IAimallBackendCartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.at(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
      },
    );
  typia.assert(detail);

  // 5. Assert all relevant fields match between original and detail lookup
  TestValidator.equals("cart item id")(detail.id)(cartItem.id);
  TestValidator.equals("cart id")(detail.aimall_backend_cart_id)(cart.id);
  TestValidator.equals("product id")(detail.aimall_backend_product_id)(
    cartItemInput.aimall_backend_product_id,
  );
  TestValidator.equals("option id")(detail.aimall_backend_product_option_id)(
    cartItemInput.aimall_backend_product_option_id,
  );
  TestValidator.equals("sku id")(detail.aimall_backend_sku_id)(
    cartItemInput.aimall_backend_sku_id,
  );
  TestValidator.equals("quantity")(detail.quantity)(cartItemInput.quantity);
  TestValidator.equals("unit price snapshot")(detail.unit_price_snapshot)(
    cartItemInput.unit_price_snapshot,
  );
  TestValidator.equals("discount snapshot")(detail.discount_snapshot)(
    cartItemInput.discount_snapshot,
  );
  TestValidator.equals("selected_name_display")(detail.selected_name_display)(
    cartItemInput.selected_name_display,
  );
  // created_at and updated_at can additionally be checked for valid ISO date if needed
}
