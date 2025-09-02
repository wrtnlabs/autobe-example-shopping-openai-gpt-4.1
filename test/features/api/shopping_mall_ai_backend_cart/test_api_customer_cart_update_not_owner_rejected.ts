import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Test that updating a shopping cart not owned by the customer is rejected.
 *
 * Scenario:
 *
 * 1. Register first customer (customer1) and create their cart.
 * 2. Register second customer (customer2) to switch authentication context.
 * 3. As customer2, attempt to update customer1's cart.
 * 4. The operation should fail with an authorization error, enforcing cart
 *    ownership boundaries.
 */
export async function test_api_customer_cart_update_not_owner_rejected(
  connection: api.IConnection,
) {
  // 1. Register first customer (customer1)
  const customer1Reg = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "Password123!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1Reg);
  const customer1Id = customer1Reg.customer.id;

  // 2. As customer1, create a cart
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_ai_backend_customer_id: customer1Id,
        cart_token: RandomGenerator.alphaNumeric(16),
        status: "active",
        note: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallAiBackendCart.ICreate,
    },
  );
  typia.assert(cart);
  const cartId = cart.id;

  // 3. Register second customer (customer2) - this switches authentication context
  const customer2Reg = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "Password123!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2Reg);

  // 4. As customer2, attempt to update customer1's cart
  await TestValidator.error(
    "should reject cart update from non-owner",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.update(
        connection,
        {
          cartId,
          body: {
            note: RandomGenerator.paragraph({ sentences: 3 }),
            status: "submitted",
          } satisfies IShoppingMallAiBackendCart.IUpdate,
        },
      );
    },
  );
}
