import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

export async function test_api_deposit_detail_success_admin_access(
  connection: api.IConnection,
) {
  /**
   * Test successful retrieval of a deposit ledger's full details by an admin.
   *
   * Flow:
   *
   * 1. Register an admin, establishing authentication and context.
   * 2. Use admin context to create a new deposit ledger (all balances explicitly
   *    set, unbound to customer/seller).
   * 3. Retrieve the created deposit's full details by depositId, ensuring all data
   *    matches creation and all fields are present.
   *
   * This validates: (a) admin can fully access the new ledger; (b) the GET
   * details API returns every required field populated and correct for
   * compliance/audit.
   */

  // 1. Register (authenticate) as admin
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(6)}@example.com`;
  const adminCreate = {
    username: adminUsername,
    password_hash: RandomGenerator.alphaNumeric(18),
    name: RandomGenerator.name(),
    email: adminEmail,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username matches input",
    adminAuth.admin.username,
    adminCreate.username,
  );
  TestValidator.equals(
    "admin email matches input",
    adminAuth.admin.email,
    adminCreate.email,
  );
  TestValidator.equals(
    "admin is_active true after join",
    adminAuth.admin.is_active,
    true,
  );

  // 2. Create deposit ledger (unbound to customer/seller, explicit balances)
  const depositCreate = {
    shopping_mall_ai_backend_customer_id: null,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 222_000,
    usable_balance: 205_000,
    expired_balance: 9_000,
    on_hold_balance: 8_000,
  } satisfies IShoppingMallAiBackendDeposit.ICreate;
  const createdDeposit =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      { body: depositCreate },
    );
  typia.assert(createdDeposit);
  TestValidator.equals(
    "deposited ledger usable_balance matches",
    createdDeposit.usable_balance,
    depositCreate.usable_balance,
  );
  TestValidator.equals(
    "deposited ledger total_accrued matches",
    createdDeposit.total_accrued,
    depositCreate.total_accrued,
  );
  TestValidator.equals(
    "deposited ledger expired_balance matches",
    createdDeposit.expired_balance,
    depositCreate.expired_balance,
  );
  TestValidator.equals(
    "deposited ledger on_hold_balance matches",
    createdDeposit.on_hold_balance,
    depositCreate.on_hold_balance,
  );
  TestValidator.equals(
    "deposited ledger customer_id is null",
    createdDeposit.shopping_mall_ai_backend_customer_id,
    null,
  );
  TestValidator.equals(
    "deposited ledger seller_id is null",
    createdDeposit.shopping_mall_ai_backend_seller_id,
    null,
  );
  TestValidator.predicate(
    "deposited ledger has valid created_at",
    typeof createdDeposit.created_at === "string" &&
      createdDeposit.created_at.length > 0,
  );
  TestValidator.predicate(
    "deposited ledger has valid updated_at",
    typeof createdDeposit.updated_at === "string" &&
      createdDeposit.updated_at.length > 0,
  );

  // 3. Retrieve details using GET endpoint and validate
  const depositId = createdDeposit.id;
  const detail = await api.functional.shoppingMallAiBackend.admin.deposits.at(
    connection,
    { depositId },
  );
  typia.assert(detail);
  TestValidator.equals(
    "fetched deposit id matches created",
    detail.id,
    createdDeposit.id,
  );
  TestValidator.equals(
    "fetched usable_balance matches creation",
    detail.usable_balance,
    createdDeposit.usable_balance,
  );
  TestValidator.equals(
    "fetched total_accrued matches creation",
    detail.total_accrued,
    createdDeposit.total_accrued,
  );
  TestValidator.equals(
    "fetched expired_balance matches creation",
    detail.expired_balance,
    createdDeposit.expired_balance,
  );
  TestValidator.equals(
    "fetched on_hold_balance matches creation",
    detail.on_hold_balance,
    createdDeposit.on_hold_balance,
  );
  TestValidator.equals(
    "fetched customer_id matches creation",
    detail.shopping_mall_ai_backend_customer_id,
    createdDeposit.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "fetched seller_id matches creation",
    detail.shopping_mall_ai_backend_seller_id,
    createdDeposit.shopping_mall_ai_backend_seller_id,
  );
  TestValidator.predicate(
    "fetched deposit has valid created_at timestamp",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched deposit has valid updated_at timestamp",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
}
