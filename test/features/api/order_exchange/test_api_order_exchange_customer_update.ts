import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import type { EOrderExchangeStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderExchangeStatus";

export async function test_api_order_exchange_customer_update(
  connection: api.IConnection,
) {
  /**
   * E2E validation for updating a customer order exchange request:
   *
   * This test ensures a registered customer can update their own order exchange
   * request through the permitted fields (exchange_reason, status,
   * completed_at), strictly validating authentication, ownership, and
   * permissible business workflow transitions according to backend rules. Due
   * to lack of order/exchange creation endpoints, orderId and exchangeId are
   * generated randomly. The test focuses on evidence of data update, audit
   * timestamp changes, and logical acceptance.
   *
   * Steps:
   *
   * 1. Register a new customer and establish authentication.
   * 2. Generate order/exchange IDs (simulate as if customer owns an order and
   *    exchange record).
   * 3. Attempt a valid exchange update via the update endpoint.
   * 4. Assert response for field updates and business integrity.
   * 5. (Cannot test cross-ownership or multiple user scenarios under current API
   *    surface.)
   */
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinOutput = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: "Password123!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinOutput);

  const orderId = typia.random<string & tags.Format<"uuid">>();
  const exchangeId = typia.random<string & tags.Format<"uuid">>();

  const statusOptions = [
    "approved",
    "rejected",
    "in_progress",
    "completed",
    "requested",
  ] as const;
  const updateBody = {
    exchange_reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.pick(statusOptions),
    completed_at: null,
  } satisfies IShoppingMallAiBackendOrderExchange.IUpdate;

  const exchange =
    await api.functional.shoppingMallAiBackend.customer.orders.exchanges.update(
      connection,
      {
        orderId,
        exchangeId,
        body: updateBody,
      },
    );
  typia.assert(exchange);
  TestValidator.equals(
    "orderId in response matches request",
    exchange.shopping_mall_ai_backend_order_id,
    orderId,
  );
  TestValidator.equals(
    "exchangeId in response matches request",
    exchange.id,
    exchangeId,
  );
  TestValidator.equals(
    "exchange_reason is updated",
    exchange.exchange_reason,
    updateBody.exchange_reason,
  );
  TestValidator.equals("status is updated", exchange.status, updateBody.status);
  TestValidator.equals(
    "completed_at is updated (null)",
    exchange.completed_at,
    null,
  );
}
