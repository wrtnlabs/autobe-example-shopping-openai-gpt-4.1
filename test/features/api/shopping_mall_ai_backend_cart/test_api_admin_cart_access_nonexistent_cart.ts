import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Test error handling when an admin accesses a nonexistent cart.
 *
 * This test checks that the API returns an appropriate error when an
 * administrator requests details for a cart ID that does not exist in the
 * database.
 *
 * Step-by-step:
 *
 * 1. Register and authenticate as an admin by POSTing to /auth/admin/join with
 *    randomized, unique credentials.
 * 2. Attempt to access a cart using GET
 *    /shoppingMallAiBackend/admin/carts/{cartId} where {cartId} is a random
 *    UUID unlikely to exist.
 * 3. Validate that the API responds with an error (typically 404 Not Found)
 *    and does not leak any sensitive data via error messages.
 *
 * Successful completion confirms proper error handling and security hygiene
 * for resource-not-found scenarios on admin-only endpoints.
 */
export async function test_api_admin_cart_access_nonexistent_cart(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminCreateInput = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test-admin.com`,
    is_active: true,
    phone_number: null,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreateInput,
  });
  typia.assert(adminAuth);

  // 2. Try to access a cart that doesn't exist
  const nonexistentCartId = typia.random<string & tags.Format<"uuid">>();

  // 3. Validate that the error is handled correctly (404 Not Found or similar)
  await TestValidator.error(
    "admin accessing nonexistent cart returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.carts.at(connection, {
        cartId: nonexistentCartId,
      });
    },
  );
}
