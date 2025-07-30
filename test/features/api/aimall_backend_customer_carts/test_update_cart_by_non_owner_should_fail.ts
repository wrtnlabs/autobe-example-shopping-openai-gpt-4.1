import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that a customer cannot update a shopping cart they do not own.
 *
 * This test simulates the following workflow:
 *
 * 1. A cart is created for a different customer (not the current authenticated
 *    user).
 * 2. The current user attempts to update that cart (using its ID) with a valid
 *    update payload.
 * 3. The API must return a forbidden or not found error, and the cart should not
 *    be modified.
 *
 * This confirms correct enforcement of cart ownership boundaries.
 */
export async function test_api_aimall_backend_customer_carts_test_update_cart_by_non_owner_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a cart for another customer to simulate a foreign cart
  const foreignCustomerId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const otherCart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: foreignCustomerId,
        // Leave session_token undefined for membership cart
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(otherCart);

  // 2. As the test user (current connection), attempt to update that other customer's cart
  //    Prepare a valid-but-simple update payload
  const updateData = {
    // simulate a cart sync/update operation (update the 'updated_at' timestamp)
    updated_at: new Date().toISOString(),
    session_token: null,
  } satisfies IAimallBackendCart.IUpdate;

  await TestValidator.error(
    "non-owner should not be able to update someone else's cart",
  )(() =>
    api.functional.aimall_backend.customer.carts.update(connection, {
      cartId: otherCart.id,
      body: updateData,
    }),
  );
}
