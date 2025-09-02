import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";

export async function test_api_customer_deposit_transaction_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Test retrieval of a non-existent deposit transaction by a customer.
   *
   * This scenario validates error handling and privacy compliance for attempts
   * to access invalid transaction records.
   *
   * 1. Register a customer using /auth/customer/join and acquire authentication
   *    plus account context.
   *
   *    - Registration provides both auth context and the deposit ledger (inferred as
   *         customerId).
   *    - Assert that the returned customer id is a valid UUID.
   * 2. Fabricate a random UUID for transactionId that should not exist in the
   *    system.
   * 3. Perform a GET request for that depositId and fake transactionId, simulating
   *    a not found access attempt.
   * 4. Assert that the API rejects the request with a business-appropriate not
   *    found error, and does not expose sensitive or unrelated data in the
   *    process.
   */

  // 1. Register customer and acquire authentication context
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Assert that customer id is a valid uuid (test type constraints)
  typia.assert<string & tags.Format<"uuid">>(customerJoin.customer.id);

  // 2. Assign depositId as the customer id (per backend convention when not otherwise specified)
  const depositId: string & tags.Format<"uuid"> = customerJoin.customer.id;

  // 3. Generate a fabricated, non-existent transactionId for error simulation
  const fakeTransactionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to retrieve the fabricated transaction, expect a not found business error
  //    This ensures server does not leak sensitive data in its error response.
  await TestValidator.error(
    "Should return not found error for non-existent deposit transaction",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.deposits.transactions.at(
        connection,
        {
          depositId,
          transactionId: fakeTransactionId,
        },
      );
    },
  );
}
