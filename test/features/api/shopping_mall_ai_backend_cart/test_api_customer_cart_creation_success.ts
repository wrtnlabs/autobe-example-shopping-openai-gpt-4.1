import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_customer_cart_creation_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful cart creation by a customer in the
   * ShoppingMallAiBackend system.
   *
   * Scenario steps:
   *
   * 1. Register a new customer using the auth/customer/join endpoint.
   *
   *    - Generate valid random customer registration details (email, phone_number,
   *         password, name, optional nickname).
   *    - This automatically authenticates the session for the customer role.
   *    - Validate response: authorized JWT and customer entity present.
   * 2. As the authenticated customer, create a cart using
   *    shoppingMallAiBackend/customer/carts POST.
   *
   *    - Set cart_token to a random value, status to a sample such as 'active', and
   *         associate with current customer by ID.
   *    - Include other optional cart fields reasonably populated (e.g., note,
   *         expires_at as null).
   *    - Validate response: all expected cart fields are present, returned cart is
   *         linked to the correct customer, status reflects the request, and
   *         system-generated fields (id, timestamps, etc.) are present.
   *
   * Assertions:
   *
   * - The cart's shopping_mall_ai_backend_customer_id matches the newly
   *   registered customer ID.
   * - The cart status matches the set value ('active').
   * - Cart_token in response matches what was used in the request.
   * - All timestamp and id fields are present and valid.
   * - No unexpected nulls or missing required fields in cart response.
   */

  // 1. Register a new customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // Customer id and token
  const customerId = joinResult.customer.id;
  TestValidator.predicate(
    "customer id is a valid uuid",
    typeof customerId === "string" && customerId.length > 0,
  );

  // 2. Create the cart as the authenticated customer
  const cartNote = RandomGenerator.paragraph({ sentences: 4 });
  const cartToken = RandomGenerator.alphaNumeric(24);
  const cartInput = {
    shopping_mall_ai_backend_customer_id: customerId,
    cart_token: cartToken,
    status: "active",
    expires_at: null,
    last_merged_at: null,
    note: cartNote,
    shopping_mall_ai_backend_customer_session_id: null,
  } satisfies IShoppingMallAiBackendCart.ICreate;

  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    {
      body: cartInput,
    },
  );
  typia.assert(cart);

  // Validate returned cart fields and associations
  TestValidator.equals(
    "newly created cart is linked to the customer",
    cart.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "cart status matches request",
    cart.status,
    cartInput.status,
  );
  TestValidator.equals(
    "cart_token matches request",
    cart.cart_token,
    cartInput.cart_token,
  );
  TestValidator.equals("cart note matches request", cart.note, cartInput.note);
  TestValidator.predicate(
    "cart id is a valid uuid",
    typeof cart.id === "string" && cart.id.length > 0,
  );
  TestValidator.predicate(
    "cart_token structure is length >= 10",
    typeof cart.cart_token === "string" && cart.cart_token.length >= 10,
  );
  TestValidator.predicate(
    "cart created_at timestamp present",
    typeof cart.created_at === "string" && cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "cart updated_at timestamp present",
    typeof cart.updated_at === "string" && cart.updated_at.length > 0,
  );
  TestValidator.equals("expires_at is null as set", cart.expires_at, null);
  TestValidator.equals(
    "last_merged_at is null as set",
    cart.last_merged_at,
    null,
  );
  TestValidator.equals(
    "session ID is null as set",
    cart.shopping_mall_ai_backend_customer_session_id,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for new cart",
    cart.deleted_at,
    null,
  );
  // Presence of required fields is confirmed by typia.assert above
}
