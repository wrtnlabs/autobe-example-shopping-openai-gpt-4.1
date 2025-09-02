import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";

export async function test_api_admin_order_refund_update_unauthorized_access(
  connection: api.IConnection,
) {
  /**
   * Test that updating an order refund through the admin API fails if no valid
   * admin authentication is provided.
   *
   * - Verifies that both missing Authorization header and explicitly invalid
   *   Authorization tokens result in HTTP error (401/403).
   * - Ensures strong role-based security enforcement on sensitive refund update
   *   API.
   *
   * Steps:
   *
   * 1. Prepare random UUIDs for orderId and refundId (does not attempt to create a
   *    real resource)
   * 2. Prepare a nominal update request body using valid DTO fields
   * 3. Attempt update using unauthenticated connection (headers: {}), expect error
   * 4. Attempt update using a connection with clearly invalid Authorization token,
   *    expect error
   */

  // 1. Generate random UUIDs for orderId and refundId
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const refundId = typia.random<string & tags.Format<"uuid">>();

  // 2. Generate a plausible update request body with allowed fields
  const updateBody = {
    refund_reason: RandomGenerator.paragraph({ sentences: 3 }),
    refund_type: RandomGenerator.pick([
      "full",
      "partial",
      "item",
      "policy",
    ] as const),
    amount: Math.floor(Math.random() * 10000 + 1000),
    currency: "KRW",
    status: RandomGenerator.pick([
      "requested",
      "approved",
      "paid",
      "completed",
    ] as const),
    processed_at: null,
    completed_at: null,
  } satisfies IShoppingMallAiBackendOrderRefund.IUpdate;

  // 3. Attempt refund update with no authentication (no Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail update as ADMIN with no authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.update(
        unauthConnection,
        {
          orderId: orderId,
          refundId: refundId,
          body: updateBody,
        },
      );
    },
  );

  // 4. Attempt refund update with invalid Authorization header
  const badAuthConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer obviously_invalid_token",
    },
  };
  await TestValidator.error(
    "should fail update as ADMIN with invalid authentication token",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.update(
        badAuthConnection,
        {
          orderId: orderId,
          refundId: refundId,
          body: updateBody,
        },
      );
    },
  );
}
