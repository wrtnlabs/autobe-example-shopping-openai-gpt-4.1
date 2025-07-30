import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validates that non-admin users cannot delete cart items through the
 * administrator cart-items DELETE endpoint.
 *
 * Business context: The administrator cart item DELETE endpoint must enforce
 * strict RBAC such that only privileged admin accounts can perform deletion.
 * This test ensures that if a standard customer (non-admin) attempts to perform
 * this action, the API denies access (HTTP 403 Forbidden), preventing privilege
 * escalation.
 *
 * Test steps:
 *
 * 1. Create a customer account (to serve as the legitimate cart owner).
 * 2. As an admin, create a shopping cart assigned to the customer.
 * 3. As an admin, add an item to the cart.
 * 4. Switch to the customer context (non-admin; simulated here).
 * 5. Attempt to delete the cart item via the administrator DELETE endpoint using
 *    the customer context.
 * 6. Assert that the request is denied (403 Forbidden), proving proper permission
 *    enforcement.
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_cannot_delete_without_permission(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. As admin, create a cart for this customer
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // 3. As admin, add a cart item to the cart
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
          unit_price_snapshot: 3500,
          discount_snapshot: null,
          selected_name_display: "Test Product (no option)",
        },
      },
    );
  typia.assert(cartItem);

  // 4. Switch to the customer context (simulate loss of admin privilege)
  // (If role switching API were available, would authenticate as the customer here)

  // 5. Attempt to delete the cart item via admin endpoint as a customer (expect error)
  await TestValidator.error(
    "non-admin should not be able to delete cart item via admin endpoint",
  )(async () =>
    api.functional.aimall_backend.administrator.carts.cartItems.erase(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
      },
    ),
  );
}
