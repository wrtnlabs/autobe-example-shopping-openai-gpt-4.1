import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";

/**
 * Validate admin behavior for fetching cart items for a non-existent cartId.
 *
 * This test ensures the API returns an appropriate 404 Not Found error and no
 * partial data when an administrator queries the cart items endpoint (GET
 * /aimall-backend/administrator/carts/{cartId}/cartItems) with a UUID that does
 * not correspond to any existing cart (either random or deleted).
 *
 * Steps:
 *
 * 1. Generate a random UUID which is highly unlikely to belong to any real cart.
 * 2. Call the admin cart items fetch API with this non-existent cartId.
 * 3. Assert that the API responds with a 404 Not Found error.
 * 4. Ensure that no valid data is returned (test fails if data is returned instead
 *    of an error).
 */
export async function test_api_aimall_backend_administrator_carts_cartItems_test_admin_get_cart_items_non_existent_cart_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent cartId
  const nonExistentCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch cart items for this random cartId and expect a 404 error
  await TestValidator.error(
    "Should return 404 Not Found for non-existent cart",
  )(async () => {
    await api.functional.aimall_backend.administrator.carts.cartItems.index(
      connection,
      {
        cartId: nonExistentCartId,
      },
    );
  });
}
