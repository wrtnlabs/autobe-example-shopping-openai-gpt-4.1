import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * [Cart session_token duplication rejection test]
 *
 * This test verifies that the API enforces a uniqueness constraint on the
 * session_token field across all shopping carts (guest/anonymous or customer),
 * preventing two carts from sharing the same session token at any time.
 *
 * - Two carts are created with distinct session_tokens (session_token_A,
 *   session_token_B).
 * - Then, an attempt is made to update the first cart's session_token to
 *   session_token_B (already used by the second cart).
 * - The API must reject the update attempt, returning a validation or conflict
 *   error (i.e., must not allow session_token duplication).
 * - This test ensures business logic correctly enforces unique constraints for
 *   both creation and updates of cart session_tokens and that proper error
 *   handling is in place.
 *
 * Workflow:
 *
 * 1. Create cart_1 with session_token_A.
 * 2. Create cart_2 with session_token_B.
 * 3. Attempt to update cart_1 and set session_token to session_token_B.
 * 4. Assert that the update is rejected (expect error).
 */
export async function test_api_aimall_backend_customer_carts_test_update_cart_with_duplicate_session_token_should_fail(
  connection: api.IConnection,
) {
  // 1. Create cart_1 with session_token_A
  const session_token_A = RandomGenerator.alphaNumeric(12);
  const cart_1 = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        session_token: session_token_A,
      },
    },
  );
  typia.assert(cart_1);

  // 2. Create cart_2 with session_token_B
  const session_token_B = RandomGenerator.alphaNumeric(12);
  const cart_2 = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        session_token: session_token_B,
      },
    },
  );
  typia.assert(cart_2);

  // 3. Attempt to update cart_1's session_token to session_token_B (should fail)
  await TestValidator.error("duplicate session_token should not be allowed")(
    async () => {
      await api.functional.aimall_backend.customer.carts.update(connection, {
        cartId: cart_1.id,
        body: {
          session_token: session_token_B,
          updated_at: new Date().toISOString(),
        },
      });
    },
  );
}
