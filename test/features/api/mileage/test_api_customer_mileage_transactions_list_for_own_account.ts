import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileageTransaction";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";

/**
 * Validate customer mileage transaction list retrieval.
 *
 * This test creates a new customer, assigns a mileage account via the admin,
 * and verifies correct pagination/filtering in transaction history retrieval.
 *
 * 1. Register a new customer (simulate a unique email, phone, channel id).
 * 2. As admin, create mileage account for that customer with random initial
 *    balance and active status.
 * 3. (Optional - if API exposed) Simulate at least one accrual/spend/bonus
 *    directly (Since no direct transaction creation API, initial balance
 *    suffices for testing listing).
 * 4. Log in as the customer (if needed).
 * 5. As the customer (via access token), list their mileage transactions using
 *    PATCH /shoppingMall/customer/mileages/{mileageId}/transactions, requesting
 *    a reasonable limit (10), and filtering by type/status/date.
 * 6. Validate: (a) Only transactions related to own mileage/account are returned.
 *    (b) Filtering by supported type (e.g., accrued) or status (e.g., applied)
 *    changes the result. (c) Pagination (limit/page) constraints are
 *    respected.
 * 7. Negative: Attempt list with unauthorized connection, and confirm error.
 *    Invalid filter values return empty or error.
 */
export async function test_api_customer_mileage_transactions_list_for_own_account(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const shoppingMallChannelId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: shoppingMallChannelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!@#",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 2. Admin creates a mileage account for the customer
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        balance: 1000, // start with some points for visibility
        status: "active",
      },
    },
  );
  typia.assert(mileage);

  // 3. List without filter - should retrieve all (likely one) transactions
  const resultAll =
    await api.functional.shoppingMall.customer.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(resultAll);
  TestValidator.predicate(
    "all transactions belong to current mileage and customer",
    resultAll.data.every(
      (t) =>
        t.shopping_mall_mileage_id === mileage.id &&
        t.shopping_mall_customer_id === customer.id,
    ),
  );

  // 4. Try filtering by a type that does not exist (e.g., 'bonus', assuming initial transaction is not bonus)
  const resultBonus =
    await api.functional.shoppingMall.customer.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "bonus",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(resultBonus);
  TestValidator.equals(
    "no bonus transactions exist for new account",
    resultBonus.data.length,
    0,
  );

  // 5. Try filtering by a correct type/status if available (e.g., accrued/applied)
  // We use any type found in first/all result
  const firstTransaction = resultAll.data[0];
  if (firstTransaction) {
    if (firstTransaction.type) {
      const filtered =
        await api.functional.shoppingMall.customer.mileages.transactions.index(
          connection,
          {
            mileageId: mileage.id,
            body: {
              type: firstTransaction.type,
              limit: 10,
              page: 1,
            },
          },
        );
      typia.assert(filtered);
      TestValidator.predicate(
        "type filter returns only matching transactions",
        filtered.data.every((tx) => tx.type === firstTransaction.type),
      );
    }
    if (firstTransaction.business_status) {
      const filtered =
        await api.functional.shoppingMall.customer.mileages.transactions.index(
          connection,
          {
            mileageId: mileage.id,
            body: {
              business_status: firstTransaction.business_status,
              limit: 10,
              page: 1,
            },
          },
        );
      typia.assert(filtered);
      TestValidator.predicate(
        "business_status filter returns only matching transactions",
        filtered.data.every(
          (tx) => tx.business_status === firstTransaction.business_status,
        ),
      );
    }
  }

  // 6. Pagination (limit smaller than available)
  const pageResult =
    await api.functional.shoppingMall.customer.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "pagination limit respected (<=1)",
    pageResult.data.length <= 1,
  );

  // 7. Negative: Attempt to access with unauthorized connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to customer mileage transactions is rejected",
    async () => {
      await api.functional.shoppingMall.customer.mileages.transactions.index(
        unauthConn,
        {
          mileageId: mileage.id,
          body: { page: 1, limit: 1 },
        },
      );
    },
  );

  // 8. Negative: Invalid filter returns empty (invalid type/status)
  const invalidFilter =
    await api.functional.shoppingMall.customer.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: { type: "___invalid_type___", limit: 10, page: 1 },
      },
    );
  typia.assert(invalidFilter);
  TestValidator.equals(
    "invalid filter returns empty result",
    invalidFilter.data.length,
    0,
  );
}
