import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";

export async function test_api_order_payment_attempt_detail_invalid_attempt_id_or_not_found(
  connection: api.IConnection,
) {
  /**
   * Test error cases when requesting payment attempt details with invalid IDs
   * or mismatched hierarchy:
   *
   * 1. Register and log in a customer (acquire auth for order/payment routes).
   * 2. Try GETting an attempt for a completely random (non-existent)
   *    order/payment/attempt ID combination – expect 404 or error.
   * 3. Try GETting with mismatched parentage: paymentId or attemptId not belonging
   *    to orderId (not really feasible to make a legitimate mismatch with only
   *    random data and no creation, so main check is random non-existent IDs).
   * 4. Verify an error occurs every time (not found or unauthorized), using
   *    TestValidator.error with async callbacks and descriptive titles.
   */
  // 1. Register and authenticate customer
  const join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(join);

  // 2. Try to fetch random non-existent payment attempt under random order/payment IDs
  await TestValidator.error(
    "GET attempt with completely random IDs returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          paymentId: typia.random<string & tags.Format<"uuid">>(),
          attemptId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
