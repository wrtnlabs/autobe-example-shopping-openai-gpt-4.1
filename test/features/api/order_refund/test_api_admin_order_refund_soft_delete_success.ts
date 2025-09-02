import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

/**
 * Test that an admin can successfully soft delete a refund entry for an
 * order.
 *
 * This test covers the direct workflow:
 *
 * 1. Register a new admin for privileged access
 * 2. Register a new customer
 * 3. Login as the customer (representing the order/refund creator)
 * 4. (Setup) Assume a new order and refund are created for the customer
 *    (placeholders used, since order/refund creation is outside provided
 *    API)
 * 5. Switch to admin authentication
 * 6. As admin, perform a soft delete operation on the refund via API using the
 *    orderId and refundId
 * 7. Validate that the operation completes successfully (API returns without
 *    error)
 *
 * Business expectation: The refund entry is now soft-deleted (deleted_at is
 * set in the backend) but retained for compliance inquiry. Direct data or
 * audit log validation is not possible due to API limits, so only lack of
 * error is asserted.
 */
export async function test_api_admin_order_refund_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin for privileged access
  const adminPwd = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.name(1)}@mall-admin.local`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPwd,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Register customer
  const customerEmail = `${RandomGenerator.name(1)}@mall-customer.local`;
  const customerPwd = RandomGenerator.alphaNumeric(10);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPwd,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 3. Login as customer
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPwd,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(customerLogin);

  // 4. No API for order/refund creation: substitute with random UUIDs to serve as orderId/refundId
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const refundId = typia.random<string & tags.Format<"uuid">>();

  // 5. Switch to admin authentication
  await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPwd,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // 6. Perform soft delete as admin
  await api.functional.shoppingMallAiBackend.admin.orders.refunds.erase(
    connection,
    {
      orderId,
      refundId,
    },
  );

  // 7. Validate that no error is thrown; success is the absence of error
}
