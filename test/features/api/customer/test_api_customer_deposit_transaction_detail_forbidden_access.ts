import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";

export async function test_api_customer_deposit_transaction_detail_forbidden_access(
  connection: api.IConnection,
) {
  /**
   * E2E test for forbidden access to another customer's deposit transaction.
   *
   * Ensures that a customer cannot view deposit transaction details belonging
   * to another customer. This test verifies access controls for the GET
   * /shoppingMallAiBackend/customer/deposits/{depositId}/transactions/{transactionId}
   * endpoint.
   *
   * Steps:
   *
   * 1. Register Customer A (owner of deposit/transaction)
   * 2. (Assume Customer A receives at least one deposit transaction upon
   *    registration or by system default)
   * 3. Register Customer B (who will attempt forbidden access)
   * 4. While authenticated as Customer B, attempt to access Customer A's
   *    transaction detail
   * 5. Validate that access is forbidden and the API returns an error
   */

  // 1. Register Customer A
  const customerAJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const aAuth = await api.functional.auth.customer.join(connection, {
    body: customerAJoinInput,
  });
  typia.assert(aAuth);
  // Ideally, we would retrieve Customer A's real deposit and transaction IDs. But no API exists to list them, so use dummy data to validate forbidden/unauthorized access path.
  const depositId = typia.random<string & tags.Format<"uuid">>();
  const transactionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register Customer B (using separate unrelated credentials)
  const customerBJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const bAuth = await api.functional.auth.customer.join(connection, {
    body: customerBJoinInput,
  });
  typia.assert(bAuth);
  // After this join, connection is authenticated as Customer B

  // 3. Attempt forbidden access to Customer A's transaction with Customer B's credentials
  await TestValidator.error(
    "Customer B cannot access another customer's deposit transaction detail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.deposits.transactions.at(
        connection,
        {
          depositId,
          transactionId,
        },
      );
    },
  );
}
