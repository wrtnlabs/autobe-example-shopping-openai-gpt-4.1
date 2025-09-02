import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";

export async function test_api_admin_order_refund_update_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for updating an order refund as an admin (success flow)
   *
   * 1. Register an admin to setup authorization context
   * 2. Register a new customer
   * 3. Log in as the customer (to create any contextual info, if necessary)
   * 4. (Normally here, an order and refund would be created, however, relevant API
   *    endpoints are not provided so we must generate plausible random IDs for
   *    test only)
   * 5. Log back in as admin
   * 6. Use the admin refund update endpoint to update refund_reason and status on
   *    a refund for an order (using random but properly formatted IDs)
   * 7. Validate the refund is updated and result matches expected values
   */

  // 1. Register and authenticate as admin
  const adminInput = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Register a new customer
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(customerAuth);

  // 3. Login as the customer
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoin.email,
      password: customerJoin.password,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(customerLogin);

  // 4. Order and refund creation is not possible with current API, so generate IDs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const refundId = typia.random<string & tags.Format<"uuid">>();

  // 5. Switch authentication back to admin (re-join guarantees SDK header update)
  await api.functional.auth.admin.join(connection, { body: adminInput });

  // 6. Update the refund as admin
  const updateInput = {
    refund_reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: RandomGenerator.pick([
      "approved",
      "completed",
      "paid",
      "requested",
    ] as const),
  } satisfies IShoppingMallAiBackendOrderRefund.IUpdate;
  const updatedRefund =
    await api.functional.shoppingMallAiBackend.admin.orders.refunds.update(
      connection,
      {
        orderId,
        refundId,
        body: updateInput,
      },
    );
  typia.assert(updatedRefund);

  // 7. Final validation
  TestValidator.equals(
    "orderId correctly updated",
    updatedRefund.shopping_mall_ai_backend_order_id,
    orderId,
  );
  TestValidator.equals(
    "refundId correctly updated",
    updatedRefund.id,
    refundId,
  );
  if (updateInput.refund_reason !== undefined)
    TestValidator.equals(
      "refund_reason update propagated",
      updatedRefund.refund_reason,
      updateInput.refund_reason,
    );
  if (updateInput.status !== undefined)
    TestValidator.equals(
      "status update propagated",
      updatedRefund.status,
      updateInput.status,
    );
}
