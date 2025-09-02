import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

export async function test_api_deposit_update_success_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test for updating a deposit ledger as an admin.
   *
   * 1. Register as an admin and authenticate.
   * 2. Create a deposit ledger for either a customer or seller.
   * 3. Prepare and send an update request to modify validation-critical fields
   *    (balances and optionally ownership).
   * 4. Confirm that the response reflects all intended updates, and validate
   *    audit/consistency rules and unchanged fields.
   *
   * This test covers the authentication, deposit creation, full update, and
   * logical and audit-field validation for the deposit entity in admin
   * context.
   */

  // 1. Admin registration/authentication setup
  const adminCreateInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreateInput,
  });
  typia.assert(adminAuth);

  // 2. Create an initial deposit ledger for a random owner
  const bindToCustomer = Math.random() < 0.5;
  const initialCreate: IShoppingMallAiBackendDeposit.ICreate = bindToCustomer
    ? {
        shopping_mall_ai_backend_customer_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        total_accrued: 200_000,
        usable_balance: 180_000,
        expired_balance: 0,
        on_hold_balance: 20_000,
      }
    : {
        shopping_mall_ai_backend_seller_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        total_accrued: 100_000,
        usable_balance: 70_000,
        expired_balance: 10_000,
        on_hold_balance: 20_000,
      };
  const deposit =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      { body: initialCreate },
    );
  typia.assert(deposit);

  // 3. Prepare update payload for key business fields
  const updatedTotalAccrued = (deposit.total_accrued || 0) + 12_345;
  const updatedUsable = (deposit.usable_balance || 0) + 4_567;
  const updatedExpired = (deposit.expired_balance || 0) + 789;
  const updatedHold = (deposit.on_hold_balance || 0) + 555;
  let updateBody: IShoppingMallAiBackendDeposit.IUpdate = {
    total_accrued: updatedTotalAccrued,
    usable_balance: updatedUsable,
    expired_balance: updatedExpired,
    on_hold_balance: updatedHold,
  };
  if (bindToCustomer) {
    updateBody.shopping_mall_ai_backend_customer_id = typia.random<
      string & tags.Format<"uuid">
    >();
  } else {
    updateBody.shopping_mall_ai_backend_seller_id = typia.random<
      string & tags.Format<"uuid">
    >();
  }

  // 4. Call update endpoint
  const updatedDeposit =
    await api.functional.shoppingMallAiBackend.admin.deposits.update(
      connection,
      {
        depositId: deposit.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDeposit);

  // 5. Logical and audit field test assertions
  TestValidator.equals("deposit id unchanged", updatedDeposit.id, deposit.id);
  TestValidator.equals(
    "updated total_accrued",
    updatedDeposit.total_accrued,
    updatedTotalAccrued,
  );
  TestValidator.equals(
    "updated usable_balance",
    updatedDeposit.usable_balance,
    updatedUsable,
  );
  TestValidator.equals(
    "updated expired_balance",
    updatedDeposit.expired_balance,
    updatedExpired,
  );
  TestValidator.equals(
    "updated on_hold_balance",
    updatedDeposit.on_hold_balance,
    updatedHold,
  );
  if (bindToCustomer) {
    TestValidator.notEquals(
      "customer id changed after update",
      updatedDeposit.shopping_mall_ai_backend_customer_id,
      deposit.shopping_mall_ai_backend_customer_id,
    );
  } else {
    TestValidator.notEquals(
      "seller id changed after update",
      updatedDeposit.shopping_mall_ai_backend_seller_id,
      deposit.shopping_mall_ai_backend_seller_id,
    );
  }
  TestValidator.notEquals(
    "updated_at field must change after update",
    updatedDeposit.updated_at,
    deposit.updated_at,
  );
  TestValidator.predicate(
    "usable_balance <= total_accrued after update",
    updatedDeposit.usable_balance <= updatedDeposit.total_accrued,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedDeposit.created_at,
    deposit.created_at,
  );
}
