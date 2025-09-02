import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Test successful creation of a new shopping cart by an admin user.
 *
 * This E2E scenario validates that an administrator can register a new
 * account, is authenticated using the system's proper admin join flow, and
 * can then create a new shopping cart through
 * /shoppingMallAiBackend/admin/carts.
 *
 * The test covers:
 *
 * 1. Admin registration and JWT authentication (via /auth/admin/join)
 * 2. Creation of an administratively-managed cart (no customer or session
 *    binding, produces a valid cart_token and business note)
 * 3. Response object validation for presence, correct typing, system-generated
 *    IDs and timestamps
 * 4. Assertion of business rules: cart.status="active", cart should not be
 *    bound to a customer
 *
 * The flow guarantees that all API and DTO contracts are respected,
 * properties are validated for non-null/undefined, and all logical context
 * flows (admin privilege, no manual header fiddling).
 */
export async function test_api_admin_cart_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and log in as a new admin (establish authentication)
  const adminInput = {
    username: RandomGenerator.name(2).replace(/\s+/g, "_"),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@test-company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const authorized = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(authorized);

  // 2. Admin creates a new cart
  const cartInput = {
    cart_token: RandomGenerator.alphaNumeric(24),
    status: "active",
    note: RandomGenerator.paragraph({ sentences: 5 }),
    shopping_mall_ai_backend_customer_id: null,
    shopping_mall_ai_backend_customer_session_id: null,
    expires_at: null,
    last_merged_at: null,
  } satisfies IShoppingMallAiBackendCart.ICreate;

  const cart = await api.functional.shoppingMallAiBackend.admin.carts.create(
    connection,
    {
      body: cartInput,
    },
  );

  typia.assert(cart);

  TestValidator.equals(
    "Cart status should be 'active' upon creation",
    cart.status,
    "active",
  );
  TestValidator.predicate(
    "Cart must have a non-null id",
    typeof cart.id === "string" && cart.id.length > 0,
  );
  TestValidator.predicate(
    "Cart should have admin context (no customer id)",
    cart.shopping_mall_ai_backend_customer_id === null,
  );
  TestValidator.predicate(
    "Cart object has all required properties",
    typeof cart.created_at === "string" && typeof cart.updated_at === "string",
  );
}
