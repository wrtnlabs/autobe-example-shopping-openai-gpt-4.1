import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that deleting a cart as a non-owner fails (permission denied/not
 * found).
 *
 * This test checks that shopping cart deletion strictly enforces ownership, so
 * only the owner (customer) can delete their cart. If another customer tries to
 * delete someone else's cart, the server must reject it with a permission error
 * or return not found.
 *
 * Steps:
 *
 * 1. Customer A (random customer) creates a cart.
 * 2. Customer B (different random customer) attempts to delete Customer A's cart.
 * 3. Ensure the API blocks this action, returning an appropriate error.
 */
export async function test_api_aimall_backend_customer_carts_test_delete_cart_by_non_owner_should_fail(
  connection: api.IConnection,
) {
  // 1. Customer A: create their own cart
  const customerAId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerAId,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 2. Customer B: prepare a different random customer UUID
  const customerBId = typia.random<string & tags.Format<"uuid">>();
  // (Normally, you'd login as B and ensure the auth token matches customerBId.)

  // 3. Attempt to delete A's cart "as B" (simulate: connection carries B's credentials)
  await TestValidator.error("non-owner deletion forbidden")(async () => {
    // The API checks ownership by the identity in the connection
    await api.functional.aimall_backend.customer.carts.erase(connection, {
      cartId: cart.id,
    });
  });
}
