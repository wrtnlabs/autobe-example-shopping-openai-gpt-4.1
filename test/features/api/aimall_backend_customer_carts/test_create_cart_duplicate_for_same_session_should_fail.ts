import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that creating a second guest cart for the same session token is
 * blocked.
 *
 * In guest/anonymous shopping scenarios, session tokens are used to associate
 * carts to non-logged-in users. Business rule requires that only one guest cart
 * may exist per session token.
 *
 * This test performs the following process:
 *
 * 1. Generates a random session token string (simulating a guest session).
 * 2. Creates a first cart for the guest with the session_token.
 * 3. Attempts to create a second cart for the same session_token.
 * 4. Asserts that the second creation attempt fails — either with a HttpError, or
 *    with a business-logic validation response indicating a
 *    uniqueness/duplication violation.
 * 5. Confirms the first cart was created (type assertion), and second cart was
 *    correctly blocked.
 */
export async function test_api_aimall_backend_customer_carts_test_create_cart_duplicate_for_same_session_should_fail(
  connection: api.IConnection,
) {
  // 1. Generate a random session token for a guest
  const session_token: string = RandomGenerator.alphaNumeric(24);

  // 2. Create the first cart for this session_token
  const cart1 = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        session_token,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart1);
  TestValidator.equals("session_token successfully assigned")(
    cart1.session_token,
  )(session_token);

  // 3. Attempt to create a second cart with the same session_token
  await TestValidator.error(
    "Duplicate cart creation for same session_token must fail",
  )(async () => {
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        session_token,
      } satisfies IAimallBackendCart.ICreate,
    });
  });
}
