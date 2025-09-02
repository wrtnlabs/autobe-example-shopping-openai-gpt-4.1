import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

export async function test_api_deposit_creation_success_admin(
  connection: api.IConnection,
) {
  /**
   * Validates successful deposit ledger creation by an admin account.
   *
   * Steps:
   *
   * 1. Register a new admin with unique credentials; authenticate (acquires admin
   *    rights for subsequent API calls)
   * 2. Prepare a deposit ledger creation payload referencing only a customer (with
   *    a random UUID) and valid initial balances
   * 3. Invoke POST /shoppingMallAiBackend/admin/deposits with authentication
   * 4. Assert all business/audit fields of the deposit ledger, including reference
   *    IDs, balance fields, and required timestamps
   */
  // 1. Register and authenticate a new admin (token auto-injected)
  const adminInput = {
    username: RandomGenerator.alphabets(12),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username matches",
    adminAuth.admin.username,
    adminInput.username,
  );
  TestValidator.equals(
    "admin email matches",
    adminAuth.admin.email,
    adminInput.email,
  );
  TestValidator.predicate(
    "admin account is active",
    adminAuth.admin.is_active === true,
  );

  // 2. Create a deposit ledger referencing a customer (not seller), setting all initial balances explicitly
  const depositInput = {
    shopping_mall_ai_backend_customer_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 100000,
    usable_balance: 100000,
    expired_balance: 0,
    on_hold_balance: 0,
  } satisfies IShoppingMallAiBackendDeposit.ICreate;
  const deposit =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      { body: depositInput },
    );
  typia.assert(deposit);

  TestValidator.equals(
    "deposit referenced customer id",
    deposit.shopping_mall_ai_backend_customer_id,
    depositInput.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "deposit referenced seller id is null",
    deposit.shopping_mall_ai_backend_seller_id,
    null,
  );
  TestValidator.equals(
    "deposit initial accrued",
    deposit.total_accrued,
    100000,
  );
  TestValidator.equals(
    "deposit usable balance",
    deposit.usable_balance,
    100000,
  );
  TestValidator.equals("deposit expired balance", deposit.expired_balance, 0);
  TestValidator.equals("deposit on hold balance", deposit.on_hold_balance, 0);
  TestValidator.predicate(
    "deposit id is uuid",
    typeof deposit.id === "string" && deposit.id.length > 0,
  );
  TestValidator.predicate(
    "deposit created_at is present",
    typeof deposit.created_at === "string" && deposit.created_at.length > 0,
  );
  TestValidator.predicate(
    "deposit updated_at is present",
    typeof deposit.updated_at === "string" && deposit.updated_at.length > 0,
  );
  TestValidator.equals(
    "deposit not deleted on creation",
    deposit.deleted_at,
    null,
  );
}
