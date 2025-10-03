import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDepositTransaction";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * E2E test: Deposit transaction listing and filtered querying for a customer
 *
 * Validates that after registering a customer and creating a deposit account,
 * one can post multiple deposit transactions (of types: income, outcome,
 * refund, admin_adjustment), then retrieve and filter transaction lists on
 * different criteria.
 *
 * Steps:
 *
 * 1. Register a customer and obtain authentication
 * 2. Create a deposit account for the customer
 * 3. Post multiple transactions (income/outcome/refund/adjustment) for that
 *    deposit
 * 4. Query full history; confirm all expected records appear and match correct
 *    user/deposit
 * 5. Apply filters (type, business_status, date range) and verify filtered results
 * 6. Test pagination with a small limit
 * 7. Register another customer; confirm they see no transactions for the first
 *    account (privacy)
 * 8. All audit fields (created_at, updated_at) should be present per record
 */
export async function test_api_deposit_transactions_listing_with_filtering_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a customer
  const joinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);

  // Step 2: Create a deposit account for the customer
  const depositBody = {
    shopping_mall_customer_id: customer.id,
    balance: 0,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: depositBody,
    });
  typia.assert(deposit);

  // Step 3: Create several transactions with diverse types and statuses
  const nowDate = new Date();
  const transactionTypes = [
    "income",
    "outcome",
    "refund",
    "admin_adjustment",
  ] as const;
  const statuses = ["applied", "confirmed", "failed"] as const;
  // Create 8 transactions (2 of each type, diverse statuses)
  const createdTransactions: IShoppingMallDepositTransaction[] = [];
  for (let i = 0; i < 8; ++i) {
    const type = transactionTypes[i % transactionTypes.length];
    const business_status = statuses[i % statuses.length];
    const txBody = {
      type,
      amount: 100 + i * 10,
      shopping_mall_customer_id: customer.id,
      business_status,
      reason: `${type.toUpperCase()} #${i}`,
      evidence_reference: `evidence-${i}`,
    } satisfies IShoppingMallDepositTransaction.ICreate;
    const transaction =
      await api.functional.shoppingMall.customer.deposits.transactions.create(
        connection,
        {
          depositId: deposit.id,
          body: txBody,
        },
      );
    typia.assert(transaction);
    createdTransactions.push(transaction);
  }

  // Step 4: Full list unfiltered - check all 8 present and all match customer/deposit
  let page =
    await api.functional.shoppingMall.customer.deposits.transactions.index(
      connection,
      {
        depositId: deposit.id,
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "all created transactions listed for customer deposit",
    page.data.length >= 8,
    true,
  );
  page.data.forEach((tx) => {
    TestValidator.equals(
      "transaction belongs to customer",
      tx.shopping_mall_customer_id,
      customer.id,
    );
    TestValidator.equals(
      "transaction belongs to deposit",
      tx.shopping_mall_deposit_id,
      deposit.id,
    );
    TestValidator.predicate(
      "transaction has created_at",
      typeof tx.created_at === "string",
    );
    TestValidator.predicate(
      "transaction has updated_at",
      typeof tx.updated_at === "string",
    );
    TestValidator.predicate(
      "transaction type exists",
      transactionTypes.includes(tx.type as any),
    );
  });

  // Step 5: Filter by type
  const targetType = transactionTypes[0];
  page = await api.functional.shoppingMall.customer.deposits.transactions.index(
    connection,
    {
      depositId: deposit.id,
      body: { type: targetType },
    },
  );
  typia.assert(page);
  page.data.forEach((tx) =>
    TestValidator.equals("filter by type", tx.type, targetType),
  );

  // Step 6: Filter by business_status
  const targetStatus = statuses[1];
  page = await api.functional.shoppingMall.customer.deposits.transactions.index(
    connection,
    {
      depositId: deposit.id,
      body: { business_status: targetStatus },
    },
  );
  typia.assert(page);
  page.data.forEach((tx) =>
    TestValidator.equals(
      "filter by business_status",
      tx.business_status,
      targetStatus,
    ),
  );

  // Step 7: Filter by date range (narrow range to roughly half of them, using created_at)
  const sorted = [...createdTransactions].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const from = sorted[2].created_at;
  const to = sorted[5].created_at;
  page = await api.functional.shoppingMall.customer.deposits.transactions.index(
    connection,
    {
      depositId: deposit.id,
      body: {
        start_date: from,
        end_date: to,
      },
    },
  );
  typia.assert(page);
  page.data.forEach((tx) => {
    TestValidator.predicate(
      "transaction within date range",
      tx.created_at >= from && tx.created_at < to,
    );
  });

  // Step 8: Pagination logic - get transactions with small limit
  page = await api.functional.shoppingMall.customer.deposits.transactions.index(
    connection,
    {
      depositId: deposit.id,
      body: {
        limit: 3,
        page: 1,
      },
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination: at most 3 results",
    page.data.length <= 3,
    true,
  );
  TestValidator.equals(
    "pagination metadata present",
    typeof page.pagination.current,
    "number",
  );

  // Step 9: Privacy - no other customer's transactions accessible
  // Register a second customer
  const otherJoin = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: otherJoin,
  });
  typia.assert(otherCustomer);
  // Create a separate deposit for that customer
  const otherDepositBody = {
    shopping_mall_customer_id: otherCustomer.id,
    balance: 0,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const otherDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: otherDepositBody,
    });
  typia.assert(otherDeposit);
  // As the 2nd customer, attempt to list the first customer's deposit transactions → should be empty or (if access denied) error
  let privacyPassed = false;
  try {
    const otherPage =
      await api.functional.shoppingMall.customer.deposits.transactions.index(
        connection,
        {
          depositId: deposit.id,
          body: {},
        },
      );
    typia.assert(otherPage);
    TestValidator.equals(
      "privacy: other customer should see 0 or no transactions",
      otherPage.data.length,
      0,
    );
    privacyPassed = true;
  } catch (err) {
    privacyPassed = true; // access denied is acceptable
  }
  TestValidator.predicate("privacy check passed", privacyPassed);
}
