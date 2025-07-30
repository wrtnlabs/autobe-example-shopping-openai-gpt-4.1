import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate the system's response when an administrator attempts to add a cart
 * item for a nonexistent or invalid product.
 *
 * This test ensures referential integrity is maintained: the system must reject
 * the attempted addition (with appropriate error) and NOT create or associate a
 * cart item for a product that does not exist or is invalid.
 *
 * Steps:
 *
 * 1. Create a test customer (admin provisioning)
 * 2. Create a new cart for that customer
 * 3. Attempt to add a cart item with a random (very likely invalid) product UUID
 * 4. Confirm that the API call fails (TestValidator.error)
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_admin_add_invalid_product_as_cart_item_returns_error(
  connection: api.IConnection,
) {
  // 1. Provision a valid customer via admin create
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
        password_hash: null,
      },
    },
  );
  typia.assert(customer);

  // 2. Create a cart for this customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // 3. Try to create a cart item referencing a random (invalid) product UUID
  await TestValidator.error(
    "should fail to add cart item with invalid product reference",
  )(async () => {
    await api.functional.aimall_backend.administrator.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          unit_price_snapshot: 9999,
        },
      },
    );
  });
}
