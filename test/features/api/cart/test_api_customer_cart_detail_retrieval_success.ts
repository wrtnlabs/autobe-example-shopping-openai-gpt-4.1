import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_customer_cart_detail_retrieval_success(
  connection: api.IConnection,
) {
  /**
   * Validate customer can retrieve details of their own cart by cartId.
   *
   * 1. Register and authenticate as a new customer.
   * 2. Simulate a cart for that customer (since there is no creation API, mock the
   *    cart in test context).
   * 3. Retrieve the cart using the retrieval endpoint.
   * 4. Validate cart identity, ownership, and confirm sensitive fields are absent.
   */

  // Step 1: Register and authenticate a new customer
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    { body: customerJoinInput },
  );
  typia.assert(customerAuthorized);
  const customer = customerAuthorized.customer;

  // Step 2: Simulate a cart for the customer (mock/test context only)
  // Since no cart creation API is available, use a random UUID to represent the cart ID
  const mockCartId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the cart via API as the authenticated customer
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.at(
    connection,
    {
      cartId: mockCartId,
    },
  );
  typia.assert(cart);

  // Step 4: Assert basic contract - response is a valid IShoppingMallAiBackendCart
  // Sanity/ownership checks (ownership field matches customer)
  // NOTE: For non-existent cart ID, test setup must ensure the test record exists or backend supports mocking. Otherwise this is a contract-only test.
  TestValidator.equals(
    "cart object includes requested id",
    cart.id,
    mockCartId,
  );
  TestValidator.equals(
    "cart is owned by registered customer",
    cart.shopping_mall_ai_backend_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "cart response does not contain sensitive fields",
    !("password" in cart) && !("token" in cart) && !("password_hash" in cart),
  );
}
