import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_cart_erase_success_customer_own_cart(
  connection: api.IConnection,
) {
  /**
   * Validate customer-owned cart soft deletion flow.
   *
   * This test ensures that a customer, after successful registration and
   * authentication, can create a shopping cart and then soft-delete it (logical
   * deletion), asserting business flow correctness.
   *
   * Step-by-step process:
   *
   * 1. Register a new customer (unique email/phone, legal name, secure password,
   *    optional nickname). Ensure authentication context is correctly
   *    established for subsequent cart operations.
   * 2. Create a shopping cart as the authenticated customer. The cart must be
   *    associated with the new customer. All required cart fields are filled
   *    with realistic, random values.
   * 3. Soft delete the newly created cart via the erase endpoint using the cart's
   *    UUID. Only the owning customer may perform this, validated by
   *    role-specific authentication.
   * 4. (Documentation only) As no GET or listing endpoint is available in this
   *    scope, direct verification of deleted_at or absence in listings is not
   *    possible. In a fully integrated suite, a follow-up GET/list would verify
   *    logical deletion.
   *
   * All responses are validated with typia.assert, TestValidator is used for
   * core logical assertions, and all random data are generated within schema
   * and business constraints. Authentication persists via SDK.
   */

  // 1. Register new customer
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const joinResponse: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(joinResponse);

  // 2. Create shopping cart as authenticated customer
  const cartInput: IShoppingMallAiBackendCart.ICreate = {
    shopping_mall_ai_backend_customer_id: joinResponse.customer.id,
    cart_token: RandomGenerator.alphaNumeric(16),
    status: "active",
    note: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const cart: IShoppingMallAiBackendCart =
    await api.functional.shoppingMallAiBackend.customer.carts.create(
      connection,
      { body: cartInput },
    );
  typia.assert(cart);
  TestValidator.equals(
    "cart is linked to the new customer",
    cart.shopping_mall_ai_backend_customer_id,
    joinResponse.customer.id,
  );

  // 3. Soft delete the cart as this customer (logical deletion/withdrawal)
  await api.functional.shoppingMallAiBackend.customer.carts.erase(connection, {
    cartId: cart.id,
  });

  // 4. No GET or index API for carts is available in this scope, so runtime check of deleted_at or cart non-listing is not possible here.
  // In a full suite, you would re-fetch to check deleted_at is set and cart is not visible in listings (except compliance contexts).
}
