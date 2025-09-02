import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_customer_cart_creation_duplicate_token_error(
  connection: api.IConnection,
) {
  /**
   * Validate that creating two carts with the same unique cart_token as the
   * same customer is rejected by API (uniqueness constraint).
   *
   * 1. Register a fresh customer (auth context)
   * 2. Create a first cart for them, supplying a unique cart_token and required
   *    fields
   * 3. Attempt to create another cart with the exact same cart_token for the same
   *    customer
   * 4. Assert first cart creation success; assert cart_token and customer id
   * 5. Assert that the duplicate cart_token creation is rejected with a runtime
   *    error
   */

  // 1. Register a new, unique customer (ensures fresh auth context)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "passw0rd!",
    phone_number: RandomGenerator.mobile(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Generate a unique cart_token to be reused for both creation attempts
  const cartToken = RandomGenerator.alphaNumeric(18);

  // 3. Create the first cart for the authenticated customer
  const cartCreate1 = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    cart_token: cartToken,
    status: "active",
  } satisfies IShoppingMallAiBackendCart.ICreate;

  const cart1 =
    await api.functional.shoppingMallAiBackend.customer.carts.create(
      connection,
      { body: cartCreate1 },
    );
  typia.assert(cart1);
  TestValidator.equals(
    "First cart_token matches input",
    cart1.cart_token,
    cartToken,
  );
  TestValidator.equals(
    "First cart's customer id matches registration",
    cart1.shopping_mall_ai_backend_customer_id,
    joinResult.customer.id,
  );

  // 4. Attempt to create a second cart using the same cart_token for the same customer
  const cartCreate2 = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    cart_token: cartToken,
    status: "active",
  } satisfies IShoppingMallAiBackendCart.ICreate;

  await TestValidator.error(
    "Duplicate cart_token should be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.create(
        connection,
        { body: cartCreate2 },
      );
    },
  );
}
