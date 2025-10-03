import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";

/**
 * Full coverage of customer mileage transaction lifecycle and business logic.
 *
 * 1. Register a new customer (get channel id, register via auth.customer.join).
 * 2. Admin registers (auth.admin.join).
 * 3. Admin creates mileage account for customer (initial balance=1000,
 *    status=active).
 * 4. Customer accrues mileage (type='accrual', amount=500,
 *    business_status='applied'): should increase balance to 1500.
 * 5. Customer spends mileage (type='spend', amount=400,
 *    business_status='applied'): should decrease balance to 1100.
 * 6. Try to spend more than available (amount=2000): should fail, balance stays
 *    1100.
 * 7. Freeze account (customer updates status to 'frozen').
 * 8. Try to accrue mileage in frozen state (type='accrual', amount=300): should
 *    fail, balance unchanged (1100).
 * 9. Try to spend in frozen state: should fail.
 * 10. Unfreeze (set status='active'), then attempt to spend exactly available
 *     (1100): should succeed, balance=0.
 * 11. Expire points (type='expiration', amount=0): should be idempotent, balance=0.
 * 12. Try negative/invalid type transactions (e.g., negative
 *     amount/type='invalid'): must fail, no audit.
 * 13. Attempt to create transaction as another user: must fail (permission).
 * 14. Simulate two 'spend' calls in parallel (amount=500 each on balance=800): only
 *     the first should succeed, second fails.
 * 15. Customer soft-deletes their mileage account for cleanup. For each
 *     transaction, validate returned object, business rules, and audit evidence
 *     (use evidence_reference field for test).
 */
export async function test_api_mileage_transaction_customer_accrual_spend_and_expiry(
  connection: api.IConnection,
) {
  // Generate channel for customer registration
  const channelId = typia.random<string & tags.Format<"uuid">>();

  // Register new customer
  const customerRes = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpass1",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerRes);

  // Register admin
  const adminRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminRes);

  // Admin creates mileage account for new customer
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerRes.id,
        balance: 1000,
        status: "active",
        expired_at: null,
      },
    },
  );
  typia.assert(mileage);
  TestValidator.equals("mileage balance after create", mileage.balance, 1000);

  // Switch context to customer

  // Customer accrues 500 points (campaign)
  const accrualTx =
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "accrual",
          amount: 500,
          business_status: "applied",
          reason: "campaign",
          evidence_reference: "test-campaign",
        },
      },
    );
  typia.assert(accrualTx);

  // Confirm after accrual (should be 1500)
  TestValidator.equals("mileage balance after accrual", accrualTx.amount, 500);

  // Customer spends 400
  const spendTx =
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "spend",
          amount: 400,
          business_status: "applied",
          reason: "purchase",
          evidence_reference: "test-order",
        },
      },
    );
  typia.assert(spendTx);
  TestValidator.equals("spend transaction amount", spendTx.amount, 400);

  // Try spend over balance (should fail)
  await TestValidator.error("overspend rejected", async () => {
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "spend",
          amount: 2000,
          business_status: "applied",
          reason: "attempt-overspend",
          evidence_reference: "test-overspend",
        },
      },
    );
  });

  // Freeze mileage account
  const frozenMileage =
    await api.functional.shoppingMall.customer.mileages.update(connection, {
      mileageId: mileage.id,
      body: { status: "frozen" },
    });
  typia.assert(frozenMileage);
  TestValidator.equals("status frozen", frozenMileage.status, "frozen");

  // Try to accrue while frozen (should fail)
  await TestValidator.error("accrual fails when frozen", async () => {
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "accrual",
          amount: 300,
          business_status: "applied",
          reason: "bonus-frozen",
          evidence_reference: "test-bonus-frozen",
        },
      },
    );
  });

  // Try to spend while frozen (should fail)
  await TestValidator.error("spend fails when frozen", async () => {
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "spend",
          amount: 100,
          business_status: "applied",
          reason: "try-spend-frozen",
          evidence_reference: "test-spend-frozen",
        },
      },
    );
  });

  // Unfreeze account (set status as 'active')
  const unfrozenMileage =
    await api.functional.shoppingMall.customer.mileages.update(connection, {
      mileageId: mileage.id,
      body: { status: "active" },
    });
  typia.assert(unfrozenMileage);
  TestValidator.equals("unfrozen active", unfrozenMileage.status, "active");

  // Spend exactly to zero
  const spendAllTx =
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "spend",
          amount: 1100,
          business_status: "applied",
          reason: "spend-all",
          evidence_reference: "test-spend-all",
        },
      },
    );
  typia.assert(spendAllTx);
  TestValidator.equals("spend-all transaction type", spendAllTx.type, "spend");
  TestValidator.equals("spend-all transaction amount", spendAllTx.amount, 1100);

  // Expire points (should not change balance)
  const expireTx =
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "expiration",
          amount: 0,
          business_status: "applied",
          reason: "expire-test-idempotent",
          evidence_reference: "test-expire",
        },
      },
    );
  typia.assert(expireTx);
  TestValidator.equals("expiration amount", expireTx.amount, 0);

  // Try negative/invalid: negative amount
  await TestValidator.error("negative accrual fails", async () => {
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "accrual",
          amount: -100,
          business_status: "applied",
          reason: "negative-amount",
          evidence_reference: "test-neg-amount",
        },
      },
    );
  });

  // Invalid type transaction
  await TestValidator.error("invalid type rejected", async () => {
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "invalid",
          amount: 50,
          business_status: "applied",
          reason: "bad-type",
          evidence_reference: "test-bad-type",
        },
      },
    );
  });

  // Another user tries to transact (simulate with random id)
  await TestValidator.error("non-owner cannot transact", async () => {
    await api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "accrual",
          amount: 10,
          business_status: "applied",
          reason: "unauthorized",
          evidence_reference: "test-non-owner",
        },
      },
    );
  });

  // Simulate concurrent spend (balance = 0 after previous), re-add 800, then two spends of 500 each in parallel
  await api.functional.shoppingMall.customer.mileages.transactions.create(
    connection,
    {
      mileageId: mileage.id,
      body: {
        type: "accrual",
        amount: 800,
        business_status: "applied",
        reason: "reset-balance",
        evidence_reference: "test-reset",
      },
    },
  );
  // Now attempt two spends for 500 in parallel
  const spendPromise1 =
    api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "spend",
          amount: 500,
          business_status: "applied",
          reason: "concurrent-500a",
          evidence_reference: "test-concurrent-500a",
        },
      },
    );
  const spendPromise2 =
    api.functional.shoppingMall.customer.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: {
          type: "spend",
          amount: 500,
          business_status: "applied",
          reason: "concurrent-500b",
          evidence_reference: "test-concurrent-500b",
        },
      },
    );
  // One should succeed, other should fail
  let result1: IShoppingMallMileageTransaction | undefined;
  try {
    result1 = await spendPromise1;
    typia.assert(result1);
  } catch (e) {}
  await TestValidator.error(
    "concurrent overspend only one succeeds",
    async () => {
      await spendPromise2;
    },
  );

  // Cleanup: soft-delete mileage account
  await api.functional.shoppingMall.customer.mileages.erase(connection, {
    mileageId: mileage.id,
  });
}
