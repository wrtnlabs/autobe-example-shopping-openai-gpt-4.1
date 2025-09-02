import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import type { EOrderExchangeStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderExchangeStatus";

export async function test_api_order_exchange_update_admin_success(
  connection: api.IConnection,
) {
  /**
   * Test successful (and forbidden) update of an order item exchange as admin.
   *
   * 1. Register a new admin account via /auth/admin/join, confirm authentication
   *    context.
   * 2. Assume an order and order exchange already exist (setup with excluded
   *    endpoints -- not covered here).
   * 3. Update the exchange with a valid new status (e.g., from 'requested' to
   *    'approved') and/or new reason with PUT
   *    /shoppingMallAiBackend/admin/orders/{orderId}/exchanges/{exchangeId}.
   * 4. Assert the returned exchange reflects the update (fields match, status
   *    transition is legal).
   * 5. Attempt an invalid update (e.g., forbidden status transition, such as from
   *    'approved' to 'requested'), and verify the update is rejected with
   *    appropriate error handling.
   */
  // 1. Register admin
  const adminCreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32), // already hashed pw string
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphabets(6)}@malladmin.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Assume an order and exchange exist (set up via excluded endpoints).
  // Here, we simulate known UUIDs for order/exchange. In real tests, use the creation API.
  // We'll simulate an exchange that is currently in 'requested' state.
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const exchangeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Perform update: valid status transition (e.g., 'requested' -> 'approved') and update reason
  const updateBody = {
    status: "approved" as EOrderExchangeStatus,
    exchange_reason: "Admin approved the exchange after document review",
  } satisfies IShoppingMallAiBackendOrderExchange.IUpdate;
  const updated =
    await api.functional.shoppingMallAiBackend.admin.orders.exchanges.update(
      connection,
      {
        orderId,
        exchangeId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "exchange status is updated to approved",
    updated.status,
    "approved" as EOrderExchangeStatus,
  );
  TestValidator.equals(
    "exchange reason is updated",
    updated.exchange_reason,
    updateBody.exchange_reason,
  );

  // 4. Attempt forbidden update: e.g., from 'approved' to 'requested' (illegal reverse)
  const forbiddenBody = {
    status: "requested" as EOrderExchangeStatus,
  } satisfies IShoppingMallAiBackendOrderExchange.IUpdate;
  await TestValidator.error(
    "forbidden status transition is rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.exchanges.update(
        connection,
        {
          orderId,
          exchangeId,
          body: forbiddenBody,
        },
      );
    },
  );
}
