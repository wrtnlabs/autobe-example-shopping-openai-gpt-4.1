import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_customer_coin_creation_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful and duplicate-guarded creation of a new coin ledger
   * for a shopping mall AI backend customer.
   *
   * Test flow:
   *
   * 1. Register (join) a new customer with all required properties.
   * 2. Confirm automatic authentication (connection receives access token).
   * 3. Create a coin ledger (wallet) for this customer, explicitly linking the
   *    customer ID and initializing coin values to 0.
   * 4. Validate the returned ledger includes all required fields (UUIDs, coin
   *    balances, correct customer linkage, timestamps).
   * 5. Attempt to create a second wallet for the same customer and verify that a
   *    business error or constraint is raised (duplicate wallet should not be
   *    allowed).
   */

  // Step 1: Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);
  const joinResponse = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResponse);
  TestValidator.equals(
    "Auth join response returns correct email",
    joinResponse.customer.email,
    email,
  );
  const customerId = joinResponse.customer.id;
  TestValidator.predicate(
    "customerId is a UUID",
    typeof customerId === "string" && /[0-9a-fA-F\-]{36}/.test(customerId),
  );

  // Step 2: Create coin ledger for this customer
  const coinCreateInput = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_coin: 0,
    expired_coin: 0,
    on_hold_coin: 0,
  } satisfies IShoppingMallAiBackendCoin.ICreate;

  const wallet =
    await api.functional.shoppingMallAiBackend.customer.coins.create(
      connection,
      {
        body: coinCreateInput,
      },
    );
  typia.assert(wallet);
  TestValidator.equals(
    "Coin ledger is linked to customer",
    wallet.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "Coin ledger starts with 0 accrued coins",
    wallet.total_accrued,
    0,
  );
  TestValidator.equals("Coin ledger usable coin is 0", wallet.usable_coin, 0);
  TestValidator.equals("Coin ledger expired coin is 0", wallet.expired_coin, 0);
  TestValidator.equals("Coin ledger on hold coin is 0", wallet.on_hold_coin, 0);
  TestValidator.predicate(
    "Wallet id is a UUID",
    typeof wallet.id === "string" && /[0-9a-fA-F\-]{36}/.test(wallet.id),
  );
  TestValidator.predicate(
    "Creation date is ISO date-time",
    typeof wallet.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(wallet.created_at),
  );

  // Step 3: Attempt to create a duplicate coin ledger for the same customer and expect an error
  await TestValidator.error(
    "Cannot create duplicate coin wallets for the same customer",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.create(
        connection,
        {
          body: coinCreateInput,
        },
      );
    },
  );
}
