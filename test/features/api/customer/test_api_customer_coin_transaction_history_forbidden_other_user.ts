import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import type { IPageIShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoinTransaction";
import type { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";

/**
 * Test access control on coin wallet transaction history endpoint.
 *
 * Business goal: ensure that only the owner of a coin wallet can query its
 * transaction history. Attempting to view transactions of another user's
 * wallet must result in a forbidden or unauthorized error.
 *
 * Steps:
 *
 * 1. Register Customer A (owner) and obtain their credentials
 * 2. (Assumed: upon registration, Customer A is assigned a wallet/ledger; if
 *    not, use a random coinId)
 * 3. Register Customer B and switch context
 * 4. Attempt to retrieve transaction history for Customer A's wallet as
 *    Customer B
 * 5. Confirm access is forbidden/unauthorized (error must be thrown)
 */
export async function test_api_customer_coin_transaction_history_forbidden_other_user(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: RandomGenerator.mobile(),
      password: "Password1!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerA);

  // 2. Pick (simulate) a coinId - in real system this should come from wallet creation or look-up
  // Use a random UUID since the system may not expose wallet creation in API. In a real case, this would be loaded from Customer A's context/profile.
  const coinId = typia.random<string & tags.Format<"uuid">>();

  // 3. Register Customer B and switch authentication context
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: RandomGenerator.mobile(),
      password: "Password2!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerB);

  // 4. Attempt access as Customer B to Customer A's coin transactions
  // 5. Confirm that forbidden/unauthorized error is thrown
  await TestValidator.error(
    "should be forbidden to view another user's coin transactions",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.transactions.index(
        connection,
        {
          coinId,
          body: {},
        },
      );
    },
  );
}
