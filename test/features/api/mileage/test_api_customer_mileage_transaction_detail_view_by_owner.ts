import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";

/**
 * Test customer ability to view their own mileage transaction details and
 * proper access control enforcement.
 *
 * 1. Register a new customer (capture their UUID).
 * 2. As admin, create a new mileage account for that customer.
 * 3. As customer, create a new mileage transaction in their mileage account.
 * 4. Retrieve the transaction detail as the (authenticated) customer and validate
 *    data matches the transaction just created.
 * 5. Attempt to access the same transaction as a different customer—should receive
 *    error/no access (permission enforcement).
 */
export async function test_api_customer_mileage_transaction_detail_view_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authCustomer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authCustomer);

  // 2. As admin, create a mileage account for the customer
  const mileageCreate = {
    shopping_mall_customer_id: authCustomer.id,
    balance: 1000,
    status: "active",
  } satisfies IShoppingMallMileage.ICreate;
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    { body: mileageCreate },
  );
  typia.assert(mileage);

  // 3. As customer, create a mileage transaction
  const transactionInput = {
    type: "accrual",
    amount: 500,
    business_status: "applied",
    reason: "signup_bonus",
  } satisfies IShoppingMallMileageTransaction.ICreate;
  const transaction =
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: transactionInput,
      },
    );
  typia.assert(transaction);

  // 4. Retrieve transaction detail as the owner
  const detail =
    await api.functional.shoppingMall.customer.mileages.transactions.at(
      connection,
      {
        mileageId: mileage.id,
        transactionId: transaction.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "Retrieved mileage transaction matches the one just created",
    detail,
    transaction,
    (key) => key === "created_at" || key === "updated_at",
  );

  // 5. Attempt access from a different customer
  const secondJoin = {
    shopping_mall_channel_id: joinInput.shopping_mall_channel_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const secondCustomer = await api.functional.auth.customer.join(connection, {
    body: secondJoin,
  });
  typia.assert(secondCustomer);

  await TestValidator.error(
    "Other customer cannot view transaction details for a mileage they do not own",
    async () => {
      await api.functional.shoppingMall.customer.mileages.transactions.at(
        connection,
        {
          mileageId: mileage.id,
          transactionId: transaction.id,
        },
      );
    },
  );
}
