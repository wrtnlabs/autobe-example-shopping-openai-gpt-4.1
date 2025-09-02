import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

/**
 * Validate updating a coin ledger as customer owner; ensure forbidden for
 * non-owner and input validation errors.
 *
 * 1. Register (and authenticate) Customer A (owner)
 * 2. Customer A creates a coin ledger (capture coinId)
 * 3. Customer A updates their coin ledger (PUT
 *    /shoppingMallAiBackend/customer/coins/{coinId}) - e.g., increment
 *    usable_coin
 * 4. Validate that the update is reflected in the response (assert updated
 *    field, unchanged id, etc.)
 * 5. Register (and authenticate) Customer B
 * 6. Customer B attempts to update Customer A's coin ledger (expect forbidden
 *    error)
 * 7. Switch back to Customer A, attempt to update own coin ledger with a
 *    negative value (expect validation error)
 */
export async function test_api_customer_coin_update_success_and_forbidden(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPhone: string = RandomGenerator.mobile();
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: customerAPhone,
      password: "1234Abc!@#" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAJoin);
  const customerA = customerAJoin.customer;

  // 2. Customer A creates coin ledger
  const coin = await api.functional.shoppingMallAiBackend.customer.coins.create(
    connection,
    {
      body: {
        shopping_mall_ai_backend_customer_id: customerA.id,
        total_accrued: 1000,
        usable_coin: 800,
        expired_coin: 0,
        on_hold_coin: 200,
      } satisfies IShoppingMallAiBackendCoin.ICreate,
    },
  );
  typia.assert(coin);
  const coinId = coin.id;
  TestValidator.equals(
    "coin owner is correct after creation",
    coin.shopping_mall_ai_backend_customer_id,
    customerA.id,
  );

  // 3. Customer A updates their coin ledger (e.g., increment usable_coin)
  const updatedUsableCoin = coin.usable_coin + 50;
  const coinUpdated =
    await api.functional.shoppingMallAiBackend.customer.coins.update(
      connection,
      {
        coinId,
        body: {
          usable_coin: updatedUsableCoin,
        } satisfies IShoppingMallAiBackendCoin.IUpdate,
      },
    );
  typia.assert(coinUpdated);
  TestValidator.equals(
    "usable_coin incremented after update",
    coinUpdated.usable_coin,
    updatedUsableCoin,
  );
  TestValidator.equals(
    "coinId remains the same after update",
    coinUpdated.id,
    coin.id,
  );
  TestValidator.equals(
    "owner remains the same after update",
    coinUpdated.shopping_mall_ai_backend_customer_id,
    customerA.id,
  );

  // 4. Register and authenticate Customer B
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPhone: string = RandomGenerator.mobile();
  const customerBJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: customerBPhone,
      password: "1234Xyz!@#" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerBJoin);
  const customerB = customerBJoin.customer;

  // 5. Customer B attempts to update Customer A's coin ledger (should result in forbidden/permission error)
  await TestValidator.error(
    "forbidden: non-owner cannot update another customer's coin ledger",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.update(
        connection,
        {
          coinId,
          body: {
            usable_coin: updatedUsableCoin + 50,
          } satisfies IShoppingMallAiBackendCoin.IUpdate,
        },
      );
    },
  );

  // 6. Re-authenticate as Customer A
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: customerAPhone,
      password: "1234Abc!@#" as string & tags.Format<"password">,
      name: customerA.name,
      nickname: customerA.nickname ?? null,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 7. Customer A attempts to update their coin ledger with negative value, expect validation error
  await TestValidator.error(
    "validation: cannot set usable_coin to negative value",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.update(
        connection,
        {
          coinId,
          body: {
            usable_coin: -10,
          } satisfies IShoppingMallAiBackendCoin.IUpdate,
        },
      );
    },
  );
}
