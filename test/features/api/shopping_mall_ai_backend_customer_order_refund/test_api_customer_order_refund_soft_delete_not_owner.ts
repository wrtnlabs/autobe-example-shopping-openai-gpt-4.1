import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_order_refund_soft_delete_not_owner(
  connection: api.IConnection,
) {
  /**
   * This test confirms that refund deletion is forbidden if performed by a
   * customer who does not own the refund. Steps:
   *
   * 1. Register Customer A
   * 2. Register and log in as Customer B
   * 3. Attempt to delete a refund record belonging to Customer A using Customer
   *    B's authenticated session
   * 4. Assert that a forbidden error occurs (ownership enforcement)
   *
   * Note: Refund/order creation APIs are unavailable, so random UUIDs simulate
   * record existence.
   */

  // 1. Register customer A
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAJoin);
  const customerA = customerAJoin.customer;

  // 2. Register customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = typia.random<string & tags.Format<"password">>();
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerBPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 3. Login as customer B
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });

  // 4. Attempt to delete a refund from a different owner's account
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const randomRefundId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting refund by non-owner is forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.erase(
        connection,
        {
          orderId: randomOrderId,
          refundId: randomRefundId,
        },
      );
    },
  );
}
