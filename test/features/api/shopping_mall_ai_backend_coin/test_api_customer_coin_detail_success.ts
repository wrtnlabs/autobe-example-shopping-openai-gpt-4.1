import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_customer_coin_detail_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for fetching the detail of a customer's own coin ledger by coinId.
   *
   * Business process:
   *
   * 1. Register and authenticate as a customer (capture tokens for session).
   * 2. Create a coin ledger (wallet) for the customer, get the coin ID.
   * 3. Retrieve details using GET /shoppingMallAiBackend/customer/coins/{coinId}
   *    as owner.
   * 4. Assert properties match between creation and retrieval.
   * 5. Attempt to access using an invalid coinId (should error).
   * 6. Attempt to access as a different authenticated customer (should be denied).
   */
  // Step 1. Register and login as a customer
  const customerJoin: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerJoin);
  const customerId: string & tags.Format<"uuid"> = customerJoin.customer.id;

  // Step 2. Create coin ledger for the customer
  const createdCoin: IShoppingMallAiBackendCoin =
    await api.functional.shoppingMallAiBackend.customer.coins.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          total_accrued: 1000,
          usable_coin: 900,
          expired_coin: 50,
          on_hold_coin: 50,
        } satisfies IShoppingMallAiBackendCoin.ICreate,
      },
    );
  typia.assert(createdCoin);

  // Step 3. Use GET /shoppingMallAiBackend/customer/coins/{coinId}
  const fetchedCoin: IShoppingMallAiBackendCoin =
    await api.functional.shoppingMallAiBackend.customer.coins.at(connection, {
      coinId: createdCoin.id,
    });
  typia.assert(fetchedCoin);
  // Step 4. Assert details match creation
  TestValidator.equals("coin id matches", fetchedCoin.id, createdCoin.id);
  TestValidator.equals(
    "customer id matches",
    fetchedCoin.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "total accrued matches",
    fetchedCoin.total_accrued,
    createdCoin.total_accrued,
  );
  TestValidator.equals(
    "usable_coin matches",
    fetchedCoin.usable_coin,
    createdCoin.usable_coin,
  );
  TestValidator.equals(
    "expired_coin matches",
    fetchedCoin.expired_coin,
    createdCoin.expired_coin,
  );
  TestValidator.equals(
    "on_hold_coin matches",
    fetchedCoin.on_hold_coin,
    createdCoin.on_hold_coin,
  );

  // Step 5. Error: Fetch invalid coinId
  await TestValidator.error(
    "fetch non-existent coinId returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.at(connection, {
        coinId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 6. Security: Access control (another customer)
  // Register a second customer
  const otherJoin: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(otherJoin);
  // Use second customer context (token switched automatically)
  await TestValidator.error(
    "non-owner customer access should be denied",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.at(connection, {
        coinId: createdCoin.id,
      });
    },
  );
}
