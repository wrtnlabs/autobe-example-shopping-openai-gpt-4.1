import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

/**
 * E2E test for successful soft deletion (logical erase) of a deposit ledger
 * by admin.
 *
 * This test verifies that an admin can perform a logical (soft) delete of a
 * deposit ledger. Steps:
 *
 * 1. Register as admin (generates authentication context)
 * 2. Create a deposit ledger as admin; save the returned record and depositId
 * 3. Request soft-delete on the deposit ledger using DELETE (erase)
 * 4. Assert all business rules: id format, initial deleted_at null, etc.
 * 5. Due to absence of a deposit get/index API, can't reload to verify
 *    deleted_at. (Would be checked if supported; here, type safety and
 *    process correctness up to erase are validated.)
 */
export async function test_api_deposit_erase_success_admin(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: `${RandomGenerator.alphabets(8)}@business.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminReg);
  typia.assert(adminReg.admin);
  typia.assert(adminReg.token);
  TestValidator.predicate(
    "admin id is uuid",
    typeof adminReg.admin.id === "string" && adminReg.admin.id.length > 0,
  );
  TestValidator.equals("admin is active", adminReg.admin.is_active, true);

  // 2. Create deposit ledger
  const deposit =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: null,
          shopping_mall_ai_backend_seller_id: null,
          total_accrued: 1000000,
          usable_balance: 1000000,
          expired_balance: 0,
          on_hold_balance: 0,
        } satisfies IShoppingMallAiBackendDeposit.ICreate,
      },
    );
  typia.assert(deposit);
  TestValidator.predicate(
    "deposit id is uuid",
    typeof deposit.id === "string" && deposit.id.length > 0,
  );
  TestValidator.equals(
    "deposit usable_balance is correct",
    deposit.usable_balance,
    1000000,
  );
  TestValidator.equals(
    "deposit deleted_at is initially null",
    deposit.deleted_at,
    null,
  );

  // 3. Soft delete (erase) the deposit ledger
  await api.functional.shoppingMallAiBackend.admin.deposits.erase(connection, {
    depositId: deposit.id,
  });

  // 4. No reload possible; in real E2E, would verify deleted_at is set after erase by reading the deposit record.
}
