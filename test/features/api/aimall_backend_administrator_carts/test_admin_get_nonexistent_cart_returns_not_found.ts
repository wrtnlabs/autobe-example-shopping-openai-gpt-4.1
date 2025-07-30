import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate 404 error when accessing a non-existent cart as administrator.
 *
 * This test ensures that when an administrator tries to retrieve a cart with a
 * random (non-existent) UUID, the API responds with a 404 Not Found error and
 * does not leak any sensitive internal details.
 *
 * Steps:
 *
 * 1. Generate a random UUID unlikely to belong to any real cart.
 * 2. Attempt to retrieve the cart as administrator by calling
 *    api.functional.aimall_backend.administrator.carts.at().
 * 3. Assert that a 404 error is thrown and that no sensitive/internal information
 *    is included in the error.
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_get_nonexistent_cart_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random, likely invalid UUID
  const invalidCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch cart and assert 404 Not Found error (no sensitive info in error)
  await TestValidator.error("should return 404 for non-existent cart")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.at(connection, {
        cartId: invalidCartId,
      });
    },
  );
}
