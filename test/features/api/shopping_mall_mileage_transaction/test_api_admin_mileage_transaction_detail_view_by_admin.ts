import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";

/**
 * Validate that an admin can fetch transaction details for any mileage account
 * and transaction for audit and compliance.
 *
 * 1. Admin registration and authentication.
 * 2. Admin creates a mileage account (for random user).
 * 3. Admin creates mileage transaction for that account.
 * 4. Admin fetches detail with
 *    /shoppingMall/admin/mileages/:mileageId/transactions/:transactionId.
 * 5. Negative: Unauthorized (missing auth) fetch attempt.
 * 6. Negative: Fetch with random (non-existent) mileageId/transactionId.
 */
export async function test_api_admin_mileage_transaction_detail_view_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin received JWT token",
    typeof admin.token?.access === "string" && admin.token?.access.length > 10,
  );

  // Step 2: Create a mileage account for a random user
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const createMileageInput = {
    shopping_mall_customer_id: customerId,
    balance: 1000,
    status: "active",
    expired_at: null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage: IShoppingMallMileage =
    await api.functional.shoppingMall.admin.mileages.create(connection, {
      body: createMileageInput,
    });
  typia.assert(mileage);
  TestValidator.equals(
    "mileage account customer id matches",
    mileage.shopping_mall_customer_id,
    customerId,
  );

  // Step 3: Create at least one mileage transaction
  const createTxInput = {
    type: RandomGenerator.pick([
      "accrual",
      "spend",
      "expiration",
      "bonus",
      "adjustment",
      "refund",
    ] as const),
    amount: 500,
    business_status: RandomGenerator.pick([
      "applied",
      "confirmed",
      "failed",
      "expired",
      "reversed",
      "in_review",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    shopping_mall_order_id: null,
    evidence_reference: null,
  } satisfies IShoppingMallMileageTransaction.ICreate;
  const tx: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: createTxInput,
      },
    );
  typia.assert(tx);
  TestValidator.equals(
    "tx links to correct mileageId",
    tx.shopping_mall_mileage_id,
    mileage.id,
  );
  TestValidator.equals(
    "tx links to correct customer",
    tx.shopping_mall_customer_id,
    customerId,
  );

  // Step 4: Admin fetches detail for the created transaction
  const detail: IShoppingMallMileageTransaction =
    await api.functional.shoppingMall.admin.mileages.transactions.at(
      connection,
      {
        mileageId: mileage.id,
        transactionId: tx.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("transaction detail is correct id", detail.id, tx.id);
  TestValidator.equals(
    "transaction detail links to mileage",
    detail.shopping_mall_mileage_id,
    mileage.id,
  );
  TestValidator.equals(
    "transaction detail links to customer",
    detail.shopping_mall_customer_id,
    customerId,
  );

  // Step 5: Unauthorized request (simulate unauth connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized admin fetch fails", async () => {
    await api.functional.shoppingMall.admin.mileages.transactions.at(
      unauthConn,
      {
        mileageId: mileage.id,
        transactionId: tx.id,
      },
    );
  });

  // Step 6: Fetch with invalid mileageId/transactionId
  await TestValidator.error("fetch with invalid mileageId fails", async () => {
    await api.functional.shoppingMall.admin.mileages.transactions.at(
      connection,
      {
        mileageId: typia.random<string & tags.Format<"uuid">>(),
        transactionId: tx.id,
      },
    );
  });
  await TestValidator.error(
    "fetch with invalid transactionId fails",
    async () => {
      await api.functional.shoppingMall.admin.mileages.transactions.at(
        connection,
        {
          mileageId: mileage.id,
          transactionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
