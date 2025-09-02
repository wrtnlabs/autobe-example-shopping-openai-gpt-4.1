import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";

export async function test_api_deposit_creation_duplicate_error(
  connection: api.IConnection,
) {
  /**
   * Validate that creating a deposit ledger for the same user (customer or
   * seller) twice results in a uniqueness error.
   *
   * Business context:
   *
   * - Only one deposit (cash ledger) can exist per customer or seller.
   * - An admin must be registered and authenticated to use admin operations.
   * - Uniqueness constraint is business-critical to prevent duplicate ledgers.
   *
   * Steps:
   *
   * 1. Register a new admin and authenticate.
   * 2. As that admin, create a deposit ledger for a new customer (random UUID).
   * 3. Attempt to create another deposit ledger for the same customer.
   * 4. Validate that the second creation fails due to uniqueness constraint.
   */

  // 1. Register and authenticate as admin
  const adminUsername: string = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // Simulate hashed password
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(2),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResponse);

  // 2. As admin, create a deposit ledger for a new customer
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const depositBody: IShoppingMallAiBackendDeposit.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_balance: 0,
    expired_balance: 0,
    on_hold_balance: 0,
  } satisfies IShoppingMallAiBackendDeposit.ICreate;
  const firstDeposit =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      {
        body: depositBody,
      },
    );
  typia.assert(firstDeposit);
  TestValidator.equals(
    "created deposit should have correct customer ID",
    firstDeposit.shopping_mall_ai_backend_customer_id,
    customerId,
  );

  // 3. Attempt to create another deposit for the SAME customer (duplicate)
  await TestValidator.error(
    "duplicate deposit creation for same customer must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.deposits.create(
        connection,
        {
          body: depositBody,
        },
      );
    },
  );
}
