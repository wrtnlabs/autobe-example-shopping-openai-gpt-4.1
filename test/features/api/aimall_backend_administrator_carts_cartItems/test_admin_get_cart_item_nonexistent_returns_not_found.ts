import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate that administrator GET
 * /aimall-backend/administrator/carts/{cartId}/cartItems/{cartItemId} returns
 * not found for nonexistent cartItemId.
 *
 * This test ensures that even with a valid cartId (i.e., an existing customer
 * cart), querying for a non-existent cart item by cartItemId as admin returns a
 * not found error. This is to verify that the endpoint does not leak
 * information about unrelated or invalid cart item IDs and enforces strict
 * error semantics.
 *
 * Step-by-step process:
 *
 * 1. Create a test customer account (for whom a cart can be created)
 * 2. Create a cart for that customer (record the cartId)
 * 3. As administrator, attempt to GET
 *    /aimall-backend/administrator/carts/{cartId}/cartItems/{cartItemId} using
 *    a valid cartId and a random/nonexistent cartItemId
 * 4. Assert that the call throws an error, verifying correct not-found logic and
 *    non-disclosure of unrelated resource information
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_admin_get_cart_item_nonexistent_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Create customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphabets(10) + "@test.com",
        phone: "010" + typia.random<string>().padStart(8, "0"),
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create cart for this customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Prepare a valid cartId but a random (guaranteed-nonexistent) cartItemId
  const nonexistentCartItemId = typia.random<string & tags.Format<"uuid">>();

  // 4. Assert that admin fetch throws error (should be not-found, but only presence of error is asserted here)
  await TestValidator.error(
    "admin fetching nonexistent cart item throws NOT FOUND",
  )(async () => {
    await api.functional.aimall_backend.administrator.carts.cartItems.at(
      connection,
      {
        cartId: cart.id,
        cartItemId: nonexistentCartItemId,
      },
    );
  });
}
