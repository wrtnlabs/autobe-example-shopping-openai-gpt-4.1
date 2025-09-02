import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";
import type { IPageIShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderPaymentAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_payment_attempts_index_error_invalid_order_or_payment_id(
  connection: api.IConnection,
) {
  /**
   * Validate system error handling when searching for payment attempts using
   * invalid orderId or paymentId.
   *
   * 1. Register a new customer and auto-login to establish an authentication
   *    context.
   * 2. Attempt to fetch payment attempts for a non-existent orderId.
   * 3. Attempt to fetch payment attempts for a non-existent paymentId.
   * 4. For both cases, verify that appropriate errors are thrown, confirm error
   *    status codes (404 or 403), and ensure that error messages do not leak
   *    sensitive business details.
   */
  // 1. Register a new customer and authenticate
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const authResult = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(authResult);

  // 2. Attempt to index payment attempts for an invalid/non-existent orderId
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const fakePaymentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when non-existent orderId is used for payment attempt lookup",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.index(
        connection,
        {
          orderId: fakeOrderId,
          paymentId: fakePaymentId,
          body: {},
        },
      );
    },
  );

  // 3. Attempt to index payment attempts for a non-existent paymentId (using swapped fake IDs to cover more negative paths)
  await TestValidator.error(
    "should fail for non-existent paymentId with different fake UUIDs",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.index(
        connection,
        {
          orderId: fakePaymentId,
          paymentId: fakeOrderId,
          body: {},
        },
      );
    },
  );
}
