import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * E2E test for updating a customer’s own shopping cart session_token (success
 * case).
 *
 * Business context: Simulates a customer updating their shopping cart’s
 * session_token, such as during session merge after login. This is a common UX
 * scenario for shopping applications, especially for merging guest and member
 * sessions.
 *
 * Steps:
 *
 * 1. Create a shopping cart for the customer using a randomly generated
 *    session_token
 * 2. Update the cart’s session_token to a new unique value (simulating a merge or
 *    reassignment)
 * 3. Assert that the returned cart reflects the updated session_token and that
 *    updated_at has changed
 *
 * Validates:
 *
 * - The session_token change is accepted and persisted
 * - The updated_at timestamp is updated to reflect the modification
 * - The cart id remains the same, confirming an in-place update
 */
export async function test_api_aimall_backend_customer_carts_test_update_cart_session_token_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Create initial cart with a random session_token
  const initialSessionToken = RandomGenerator.alphaNumeric(16);
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        session_token: initialSessionToken,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 2. Update cart’s session_token to a new, unique value
  const newSessionToken = RandomGenerator.alphaNumeric(20);
  const updated = await api.functional.aimall_backend.customer.carts.update(
    connection,
    {
      cartId: cart.id,
      body: {
        session_token: newSessionToken,
        updated_at: new Date().toISOString(),
      } satisfies IAimallBackendCart.IUpdate,
    },
  );
  typia.assert(updated);

  // 3. Validate session_token and updated_at changes
  TestValidator.equals("session_token updated")(updated.session_token)(
    newSessionToken,
  );
  TestValidator.notEquals("updated_at changed")(updated.updated_at)(
    cart.updated_at,
  );
  TestValidator.equals("cart id unchanged")(updated.id)(cart.id);
}
