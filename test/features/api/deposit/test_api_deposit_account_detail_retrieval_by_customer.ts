import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";

/**
 * Validate that a customer can retrieve their own deposit account details and
 * that access control prevents unauthorized access.
 *
 * 1. Register a new customer (customer1).
 * 2. Create a deposit account for customer1.
 * 3. Retrieve deposit details as customer1 and validate all fields, checking that
 *    deleted_at is null or undefined for active accounts.
 * 4. Register a second customer (customer2) and attempt to access customer1's
 *    deposit account, expecting an error.
 * 5. (Soft delete simulation) If possible, manually create a deposit with
 *    deleted_at set; retrieve and check deleted metadata present, and confirm
 *    that further operations are not permitted. (Skip if no API for
 *    deletion/soft-deletion.)
 * 6. Test access with invalid/missing depositId (random UUID), expect error.
 */
export async function test_api_deposit_account_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Register channel (simulate)
  const channelId = typia.random<string & tags.Format<"uuid">>();

  // 1. Register customer1
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channelId,
        email: customer1Email,
        password: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer1);

  // 2. Create deposit for customer1
  const deposit1: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: {
        shopping_mall_customer_id: customer1.id,
        balance: 50000,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    });
  typia.assert(deposit1);

  // 3. Retrieve deposit as customer1
  const retrieved: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.at(connection, {
      depositId: deposit1.id,
    });
  typia.assert(retrieved);
  TestValidator.equals("deposit id should match", retrieved.id, deposit1.id);
  TestValidator.equals(
    "customer id should match",
    retrieved.shopping_mall_customer_id,
    customer1.id,
  );
  TestValidator.equals("balance should match", retrieved.balance, 50000);
  TestValidator.equals("status should be active", retrieved.status, "active");
  TestValidator.predicate(
    "deleted_at should be null or undefined for active account",
    retrieved.deleted_at === null || retrieved.deleted_at === undefined,
  );

  // 4. Register customer2 and test access control
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channelId,
        email: customer2Email,
        password: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer2);

  await TestValidator.error(
    "customer2 cannot access customer1's deposit",
    async () => {
      await api.functional.shoppingMall.customer.deposits.at(connection, {
        depositId: deposit1.id,
      });
    },
  );

  // 5. Test invalid/missing depositId (random UUID)
  const randomDepositId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "accessing unknown deposit id should fail",
    async () => {
      await api.functional.shoppingMall.customer.deposits.at(connection, {
        depositId: randomDepositId,
      });
    },
  );
}
