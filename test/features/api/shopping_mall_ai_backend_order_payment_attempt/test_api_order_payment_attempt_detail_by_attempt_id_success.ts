import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";

export async function test_api_order_payment_attempt_detail_by_attempt_id_success(
  connection: api.IConnection,
) {
  /**
   * End-to-end test: Retrieve details of a payment attempt by attemptId for an
   * authenticated customer.
   *
   * Business context: Validates that a logged-in customer can successfully
   * access details for a payment attempt (by attemptId), confirming correctness
   * of authentication, access control, and entity schema. Simulates required
   * entity IDs due to the absence of explicit creation endpoints.
   *
   * Steps:
   *
   * 1. Register and log in a customer to obtain an authenticated session.
   * 2. Simulate orderId, paymentId, and attemptId with random valid UUIDs due to
   *    lack of resource creation APIs.
   * 3. Retrieve payment attempt details and assert the returned entity matches the
   *    correct structure and supplied attemptId.
   */

  // Step 1: Register and authenticate the customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResponse = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResponse);

  // Step 2: Simulate order, payment, and attempt IDs (realistic UUIDs)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const paymentId = typia.random<string & tags.Format<"uuid">>();
  const attemptId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve payment attempt details using authenticated session
  const paymentAttempt =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.at(
      connection,
      {
        orderId,
        paymentId,
        attemptId,
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "returned attemptId matches requested attemptId",
    paymentAttempt.id,
    attemptId,
  );
}
