import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendLoyaltyTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * Validates creation and business-rule enforcement for loyalty transactions by
 * an administrator.
 *
 * This test covers all CRUD and business scenarios for loyalty transactions:
 *
 * - Successful creation of each type (`accrual`, `redemption`, `expiration`,
 *   `refund_reversal`) with valid data
 * - Database persistence via read-back (GET)
 * - Business validation rules: amount sign, boundary values, duplicate prevention
 * - Field validation: required/optional/missing
 * - Access control checks (admin/non-admin context)
 * - Audit trail: referenced (not directly validated)
 *
 * Steps:
 *
 * 1. Generate test UUIDs for customer/order/coupon events.
 * 2. For each type, create valid transaction; verify echo and persistence.
 * 3. Test business logic restrictions: sign, bounds, duplication, missing.
 * 4. Simulate access denial for non-admin/non-privileged context.
 * 5. Document audit log requirement (no direct test).
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_create_loyalty_transaction_success_scenarios_and_validation_errors(
  connection: api.IConnection,
) {
  // 1. Prepare candidate IDs and a shared order/coupon uuid for reuse
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const order_id = typia.random<string & tags.Format<"uuid">>();
  const coupon_id = typia.random<string & tags.Format<"uuid">>();
  const description = "E2E test transaction";

  const types = ["accrual", "redemption", "expiration", "refund_reversal"];

  // 2. Successful creation for each type
  for (const type of types) {
    // Amount: Accrual/Refund (+), Redemption/Expiration (-)
    let amount: number;
    switch (type) {
      case "accrual":
      case "refund_reversal":
        amount = 100;
        break;
      case "redemption":
      case "expiration":
        amount = -20;
        break;
      default:
        amount = 10;
    }
    const body = {
      customer_id,
      order_id,
      coupon_id,
      amount,
      type,
      description,
      expired_at:
        type === "expiration"
          ? new Date(Date.now() + 1000 * 3600 * 24).toISOString()
          : null,
    } satisfies IAimallBackendLoyaltyTransaction.ICreate;

    // 2a. Create transaction
    const created =
      await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
        connection,
        { body },
      );
    typia.assert(created);
    TestValidator.equals("echo customer")(created.customer_id)(customer_id);
    TestValidator.equals("echo amount")(created.amount)(amount);
    TestValidator.equals("echo type")(created.type)(type);
    if (type === "expiration") {
      TestValidator.predicate("has expired_at")(
        typeof created.expired_at === "string" && created.expired_at !== null,
      );
    }

    // 2b. Verify with GET (persistence check)
    const page =
      await api.functional.aimall_backend.administrator.loyaltyTransactions.index(
        connection,
      );
    typia.assert(page);
    const record = page.data.find((tx) => tx.id === created.id);
    TestValidator.predicate("created tx exists in index")(!!record);
    if (record) {
      TestValidator.equals("field match")(record.type)(type);
      TestValidator.equals("field match")(record.amount)(amount);
      TestValidator.equals("field match")(record.customer_id)(customer_id);
    }
  }

  // 3. Business validation: invalid negative amount for accrual (should fail)
  await TestValidator.error("negative accrual fails")(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          amount: -50,
          type: "accrual",
        } satisfies IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  });

  // 4. Business validation: positive amount for redemption (should fail)
  await TestValidator.error("positive redemption fails")(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          amount: 100,
          type: "redemption",
        } satisfies IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  });

  // 5. Business validation: excessive amount (simulate over-boundary)
  await TestValidator.error("excess accrual fails")(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          amount: 1000000,
          type: "accrual",
        } satisfies IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  });

  // 6. Business rule: duplicate accrual by order/coupon (should fail)
  const dupeCustomer = typia.random<string & tags.Format<"uuid">>();
  const dupeOrder = typia.random<string & tags.Format<"uuid">>();
  const dupeCoupon = typia.random<string & tags.Format<"uuid">>();
  // First should succeed
  const first =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: {
          customer_id: dupeCustomer,
          order_id: dupeOrder,
          coupon_id: dupeCoupon,
          amount: 99,
          type: "accrual",
          description: "Dupe accrual 1",
        } satisfies IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  typia.assert(first);
  // Second with same combination must fail
  await TestValidator.error("duplicate accrual not allowed")(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: {
          customer_id: dupeCustomer,
          order_id: dupeOrder,
          coupon_id: dupeCoupon,
          amount: 68,
          type: "accrual",
          description: "Dupe accrual 2",
        } satisfies IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  });

  // 7. Missing required field: customer_id omitted (should fail at runtime)
  await TestValidator.error("missing customer_id fails")(async () => {
    // Use empty object/satisfies to demonstrate runtime API error
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: {
          amount: 10,
          type: "accrual",
        } as IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  });

  // 8. Simulate unprivileged (non-admin) context by removing Authorization header
  // Correct fix: clone connection & headers, then delete Authorization from headers
  const unauthHeaders = { ...connection.headers };
  delete unauthHeaders.Authorization;
  const connectionNoAuth = { ...connection, headers: unauthHeaders };
  await TestValidator.error("non-admin access fails")(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connectionNoAuth,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          amount: 10,
          type: "accrual",
        } satisfies IAimallBackendLoyaltyTransaction.ICreate,
      },
    );
  });

  // 9. Note: Direct audit-log validation is skipped (no API surfaced). Comment for coverage.
  // // If/when audit log API is available: retrieve recent audit matching POST for compliance validation
}
