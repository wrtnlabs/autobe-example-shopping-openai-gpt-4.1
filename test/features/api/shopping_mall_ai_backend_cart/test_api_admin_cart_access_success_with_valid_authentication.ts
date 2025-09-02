import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_admin_cart_access_success_with_valid_authentication(
  connection: api.IConnection,
) {
  /**
   * Validate that an admin can access the details of any cart after login.
   *
   * Scenario:
   *
   * 1. Register and authenticate a new admin using the join endpoint (admin
   *    account created, token attached).
   * 2. As authenticated admin, create a new cart with random metadata (cart_token,
   *    status, etc).
   * 3. Retrieve the created cart using its id via the GET
   *    /shoppingMallAiBackend/admin/carts/{cartId} endpoint.
   * 4. Assert that the fetched cart matches the created cart (id and metadata),
   *    confirming admin privilege to view arbitrary carts.
   *
   * All entities are validated for schema correctness. No customer context is
   * needed; only admin privilege is tested.
   */

  // 1. Admin registers and authenticates
  const password = RandomGenerator.alphaNumeric(16);
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin-test.local`;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: password,
      name: adminName,
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  typia.assert(adminAuth.admin);
  typia.assert(adminAuth.token);

  // 2. Admin creates a new cart
  const cartToken = RandomGenerator.alphaNumeric(24);
  const cartStatus = "active";
  const createdCart =
    await api.functional.shoppingMallAiBackend.admin.carts.create(connection, {
      body: {
        cart_token: cartToken,
        status: cartStatus,
        shopping_mall_ai_backend_customer_id: null,
        shopping_mall_ai_backend_customer_session_id: null,
        expires_at: null,
        last_merged_at: null,
        note: null,
      } satisfies IShoppingMallAiBackendCart.ICreate,
    });
  typia.assert(createdCart);

  // 3. Admin fetches the cart by id
  const fetchedCart = await api.functional.shoppingMallAiBackend.admin.carts.at(
    connection,
    {
      cartId: createdCart.id,
    },
  );
  typia.assert(fetchedCart);

  // 4. Assert that the fetched cart matches the created one
  TestValidator.equals("cart id should match", fetchedCart.id, createdCart.id);
  TestValidator.equals(
    "cart token should match",
    fetchedCart.cart_token,
    createdCart.cart_token,
  );
  TestValidator.equals(
    "cart customer id should match",
    fetchedCart.shopping_mall_ai_backend_customer_id,
    createdCart.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "cart session id should match",
    fetchedCart.shopping_mall_ai_backend_customer_session_id,
    createdCart.shopping_mall_ai_backend_customer_session_id,
  );
  TestValidator.equals(
    "cart status should match",
    fetchedCart.status,
    createdCart.status,
  );
  TestValidator.equals(
    "cart note should match",
    fetchedCart.note,
    createdCart.note,
  );
}
