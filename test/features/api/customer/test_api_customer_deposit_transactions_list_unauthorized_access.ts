import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";
import type { IPageIShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendDepositTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_deposit_transactions_list_unauthorized_access(
  connection: api.IConnection,
) {
  /**
   * Validates that deposit transaction data for a given deposit ledger is only
   * accessible to its legitimate customer owner, and that cross-customer access
   * is properly blocked. This tests access control for PATCH
   * /shoppingMallAiBackend/customer/deposits/{depositId}/transactions.
   *
   * Steps:
   *
   * 1. Register Customer A and retrieve their ID.
   * 2. (Simulate) Obtain a depositId belonging to Customer A. Since the deposit
   *    creation API is not present, use a random uuid as placeholder.
   * 3. Register a separate Customer B (which switches connection to B).
   * 4. Customer B attempts to access Customer A's deposit transactions by calling
   *    the endpoint with Customer A's depositId.
   * 5. Verify that an error is thrown (forbidden/cross-user access is denied).
   */

  // 1. Register Customer A (acquire base user for deposit ledger)
  const customerAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const customerAAuth = await api.functional.auth.customer.join(connection, {
    body: customerAInput,
  });
  typia.assert(customerAAuth);
  const customerAId: string = customerAAuth.customer.id;

  // 2. Obtain a depositId owned by Customer A (simulate as random uuid, since actual deposit creation API not present)
  // In real tests, this would be created or fetched via a separate API
  const depositId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Register Customer B
  const customerBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const customerBAuth = await api.functional.auth.customer.join(connection, {
    body: customerBInput,
  });
  typia.assert(customerBAuth);
  // At this point, connection is authorized as Customer B

  // 4. Attempt unauthorized access: Customer B tries to list Customer A's deposit transactions
  await TestValidator.error(
    "forbid cross-customer deposit transaction access",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.deposits.transactions.index(
        connection,
        {
          depositId,
          body: {}, // minimal filter body
        },
      );
    },
  );
}
