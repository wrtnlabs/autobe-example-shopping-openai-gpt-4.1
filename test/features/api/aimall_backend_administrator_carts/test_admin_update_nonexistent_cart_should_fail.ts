import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Test updating a shopping cart with a non-existent or invalid cartId as
 * administrator.
 *
 * This test verifies that when an administrator attempts to update a cart using
 * an invalid (non-existent or syntactically incorrect) cartId, the system
 * responds with the appropriate error (such as not found or validation error),
 * and does not create or alter any cart data.
 *
 * 1. Construct an obviously invalid or random UUID for cartId that is not present
 *    in the system.
 * 2. Attempt to update the cart via the administrator API, providing a valid
 *    update body.
 * 3. Assert that the operation fails with an error (e.g., not found or validation
 *    error).
 * 4. Confirm no cart was created or updated as a result of the attempt.
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_update_nonexistent_cart_should_fail(
  connection: api.IConnection,
) {
  // Step 1: Prepare a cartId that does not exist in the database (random UUID)
  const nonexistentCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Prepare a valid update body for IAimallBackendCart.IUpdate
  const updateBody: IAimallBackendCart.IUpdate = {
    session_token: RandomGenerator.alphaNumeric(16),
    updated_at: new Date().toISOString(),
  };

  // Step 3: Attempt to update the nonexistent cart, expecting a not found or validation error
  await TestValidator.error("updating nonexistent cart should throw error")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.update(
        connection,
        {
          cartId: nonexistentCartId,
          body: updateBody,
        },
      );
    },
  );
}
