import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate creation of a shopping cart for an anonymous (guest) session using a
 * unique session_token.
 *
 * This test verifies the business logic that an anonymous user (guest) can
 * create a shopping cart by supplying only a unique session_token, and the cart
 * is correctly attributed to the session (not any customer). It also optionally
 * checks that creating another cart with the same session_token fails as per
 * uniqueness constraints.
 *
 * Test Steps:
 *
 * 1. Generate a unique session_token to represent a new guest session.
 * 2. Call the create cart API with this session_token (without a customer_id).
 * 3. Verify the created cart:
 *
 *    - Has the exact session_token assigned.
 *    - Does not have a customer_id.
 *    - Has a valid UUID for id, and present created_at/updated_at timestamps.
 * 4. (Optional) Attempt to create another cart with the same session_token and
 *    expect failure due to uniqueness rule.
 */
export async function test_api_aimall_backend_customer_carts_test_create_cart_for_guest_session_with_unique_session_token(
  connection: api.IConnection,
) {
  // 1. Generate a unique session_token for representing a guest/anonymous user
  const sessionToken: string = RandomGenerator.alphaNumeric(32);

  // 2. Create a shopping cart with only the session_token (guest cart, no customer_id)
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        session_token: sessionToken,
        // Don't provide aimall_backend_customer_id (guest case)
        // Omit timestamps (server assigns automatically)
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Verify core cart properties and business rules
  TestValidator.equals("cart is for correct session_token")(cart.session_token)(
    sessionToken,
  );
  TestValidator.equals("cart has no customer_id")(
    cart.aimall_backend_customer_id,
  )(undefined);
  TestValidator.predicate("cart id looks like a UUID")(
    typeof cart.id === "string" && cart.id.length > 20,
  );
  TestValidator.predicate("created_at exists")(!!cart.created_at);
  TestValidator.predicate("updated_at exists")(!!cart.updated_at);

  // 4. (Optional) Attempt to create another cart with the SAME session_token: should fail if uniqueness enforced
  //    If system throws as expected, this will pass; otherwise adjust as per system's actual behavior
  await TestValidator.error(
    "duplicate anonymous cart with same session_token must fail",
  )(async () => {
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        session_token: sessionToken,
      } satisfies IAimallBackendCart.ICreate,
    });
  });
}
