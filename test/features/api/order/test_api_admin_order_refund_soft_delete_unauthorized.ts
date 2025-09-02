import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_order_refund_soft_delete_unauthorized(
  connection: api.IConnection,
) {
  /**
   * E2E test for unauthorized soft deletion of an order's refund via admin
   * endpoint.
   *
   * This test verifies that only authenticated admins can perform a soft delete
   * of a refund record.
   *
   * Steps performed:
   *
   * 1. Register a customer account (preconditions setup; not used further).
   * 2. Register an admin (setup; but connection for delete is NOT authenticated as
   *    admin).
   * 3. Create a new connection object with empty headers to simulate an
   *    unauthenticated context.
   * 4. Attempt to soft-delete a refund for a random order/refund UUID, expecting
   *    the API to deny permission.
   * 5. Validate correct authorization enforcement by asserting error is thrown on
   *    the operation.
   *
   * Note: Because the necessary refund/order creation endpoints are
   * unavailable, random UUIDs are used for the test.
   */
  // 1. Register customer (fulfills dependency for lifecycle, not otherwise used)
  await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 2. Register admin (setup; don't use admin session for deletion)
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: typia.random<string>(),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // 3. Simulate unauthorized API call by using a connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to soft-delete refund as unauthorized user; expect a permission error
  await TestValidator.error(
    "should not allow refund soft-delete without admin authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.erase(
        unauthConn,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          refundId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
