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
 * Test that attempting to retrieve another user's cart items is denied (403
 * Forbidden).
 *
 * This test ensures strict ownership access control for cart items: even if a
 * user tries to access another customer's cart using a known cart UUID, the API
 * must prevent it and return a 403 error.
 *
 * Step-by-step process:
 *
 * 1. Create Customer A (the real cart owner).
 * 2. Customer A creates a cart.
 * 3. Customer A adds a single item to that cart.
 * 4. Create Customer B (an unrelated user).
 * 5. Attempt to access Customer A's cart items while authenticated as Customer B.
 * 6. Confirm 403 Forbidden response (access is denied to non-owner).
 */
export async function test_api_aimall_backend_test_get_cart_items_for_non_owner_returns_access_denied(
  connection: api.IConnection,
) {
  // 1. Create Customer A (the cart owner)
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPhone = RandomGenerator.mobile();
  const customerAInput: IAimallBackendCustomer.ICreate = {
    email: customerAEmail,
    phone: customerAPhone,
    password_hash: "hashed_pw_a",
    status: "active",
  };
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerAInput },
  );
  typia.assert(customerA);

  // 2. Customer A creates a cart
  const cartInput: IAimallBackendCart.ICreate = {
    aimall_backend_customer_id: customerA.id,
  };
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // 3. Customer A adds an item to the cart
  const cartItemInput: IAimallBackendCartItem.ICreate = {
    aimall_backend_product_id: typia.random<string & tags.Format<"uuid">>(),
    aimall_backend_product_option_id: null,
    aimall_backend_sku_id: null,
    quantity: 1,
    unit_price_snapshot: 10000,
    discount_snapshot: null,
    selected_name_display: "Test product option",
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

  // 4. Create Customer B (a second, unauthorized user)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPhone = RandomGenerator.mobile();
  const customerBInput: IAimallBackendCustomer.ICreate = {
    email: customerBEmail,
    phone: customerBPhone,
    password_hash: "hashed_pw_b",
    status: "active",
  };
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerBInput },
  );
  typia.assert(customerB);

  // 5. (Assumption per SDK: switching to Customer B's context is via test infra or header adjustment)
  // In real tests, inject Customer B's authentication/session token here as needed.

  // 6. Attempt to get Customer A's cart items as Customer B - expect 403 Forbidden
  await TestValidator.error("access denied for non-owner cart query")(
    async () => {
      await api.functional.aimall_backend.customer.carts.cartItems.index(
        connection,
        { cartId: cart.id },
      );
    },
  );
}
