import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Validate that customers cannot delete shopping carts belonging to other
 * users (authorization boundary).
 *
 * Test flow:
 *
 * 1. Register customer A and authenticate as A.
 * 2. Customer A creates a cart (owned by customer A).
 * 3. Register a different customer B and switch authentication context to B.
 * 4. While authenticated as B, attempt to delete the cart created by customer
 *    A using its cartId.
 * 5. Assert that the delete operation fails with a forbidden or not found
 *    error (i.e., B cannot erase A's cart).
 */
export async function test_api_cart_erase_other_customer_cart_forbidden(
  connection: api.IConnection,
) {
  // 1. Register first customer (Cart Owner: customer A)
  const customerAJoin: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: typia.random<string & tags.Format<"password">>(),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerAJoin);
  const customerAId: string = customerAJoin.customer.id;

  // 2. Create a cart for customer A (ownership check)
  const cartA: IShoppingMallAiBackendCart =
    await api.functional.shoppingMallAiBackend.customer.carts.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerAId,
          cart_token: RandomGenerator.alphaNumeric(16),
          status: "active",
          note: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAiBackendCart.ICreate,
      },
    );
  typia.assert(cartA);
  const cartAId: string = cartA.id;
  TestValidator.equals(
    "cart is owned by customerA after creation",
    cartA.shopping_mall_ai_backend_customer_id,
    customerAId,
  );

  // 3. Register second customer (attacker: customer B)
  const customerBJoin: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: typia.random<string & tags.Format<"password">>(),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerBJoin);
  // Auth context now set to B due to automatic token management.

  // 4. Attempt to erase cartA as customer B – must fail (no ownership)
  await TestValidator.error(
    "customer B cannot erase customer A's cart",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.erase(
        connection,
        {
          cartId: cartAId,
        },
      );
    },
  );
}
