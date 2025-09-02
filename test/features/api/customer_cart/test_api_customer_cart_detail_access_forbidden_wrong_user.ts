import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_customer_cart_detail_access_forbidden_wrong_user(
  connection: api.IConnection,
) {
  /**
   * Test that an authenticated customer (Customer B) cannot access cart detail
   * for another customer (Customer A).
   *
   * Steps:
   *
   * 1. Register Customer A (activate authentication as Customer A)
   * 2. Simulate obtaining Customer A's cart UUID (in a real system, this would
   *    come from a list or session/cart API)
   * 3. Register Customer B (switches authentication context to Customer B)
   * 4. As Customer B, attempt to access Customer A's cart via
   *    /shoppingMallAiBackend/customer/carts/{cartId}
   * 5. Confirm that access is denied (forbidden/unauthorized)
   */

  // 1. Register Customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPhone: string = RandomGenerator.mobile();
  const customerAName: string = RandomGenerator.name();
  const customerAPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const joinA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: customerAPhone,
      password: customerAPassword,
      name: customerAName,
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinA);
  const customerAId = joinA.customer.id;

  // 2. Simulate Customer A's cart ID (would get from a cart list/session in production)
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Register Customer B
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPhone: string = RandomGenerator.mobile();
  const customerBName: string = RandomGenerator.name();
  const customerBPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const joinB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: customerBPhone,
      password: customerBPassword,
      name: customerBName,
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinB);

  // 4. Attempt to access Customer A's cart as Customer B
  await TestValidator.error(
    "Customer B cannot access Customer A's cart detail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.carts.at(connection, {
        cartId: cartId,
      });
    },
  );
}
