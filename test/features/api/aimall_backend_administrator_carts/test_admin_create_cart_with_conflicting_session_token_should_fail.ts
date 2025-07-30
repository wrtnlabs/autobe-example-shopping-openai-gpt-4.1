import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that the backend enforces uniqueness of session_token for carts.
 *
 * Business context: The aimall_backend_carts table enforces a uniqueness
 * constraint over the session_token field for guest carts. This prevents
 * multiple carts from being associated with the same guest session.
 * Administrators can use the cart creation endpoint for recoveries or to
 * simulate guest operations in support scenarios, but creating two carts for
 * the same session_token must not be allowed.
 *
 * Test process:
 *
 * 1. Generate a random session_token to simulate a guest session.
 * 2. As admin, create the first guest cart using the administrator endpoint and
 *    this session_token. This should succeed.
 * 3. Attempt to create another cart using the exact same session_token, again via
 *    the administrator endpoint. This MUST fail per the business rule.
 * 4. Assert that the error occurs (do not inspect error type or message).
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_create_cart_with_conflicting_session_token_should_fail(
  connection: api.IConnection,
) {
  // 1. Generate fake guest session_token
  const sessionToken: string = RandomGenerator.alphaNumeric(32);

  // 2. Admin creates initial guest cart for the session_token
  const guestCart =
    await api.functional.aimall_backend.administrator.carts.create(connection, {
      body: {
        session_token: sessionToken,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(guestCart);
  TestValidator.equals("cart-created session_token matches input")(
    guestCart.session_token,
  )(sessionToken);

  // 3. Attempt to create a second cart (duplicate) with same session_token
  await TestValidator.error("should reject duplicate session_token for cart")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.create(
        connection,
        {
          body: {
            session_token: sessionToken,
          } satisfies IAimallBackendCart.ICreate,
        },
      );
    },
  );
}
