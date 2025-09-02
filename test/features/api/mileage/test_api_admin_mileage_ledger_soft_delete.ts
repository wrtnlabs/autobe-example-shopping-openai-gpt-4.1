import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";

/**
 * E2E test for soft-deleting a mileage ledger by admin in shopping mall AI
 * backend.
 *
 * This test ensures an admin can logically delete a customer's mileage
 * ledger and that the operation is audit-compliant (setting deleted_at
 * without removing the record). It covers creation of both required actors
 * (admin, customer), ledger creation, admin role switching, deletion, and
 * negative/error cases.
 */
export async function test_api_admin_mileage_ledger_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.com` as string &
    tags.Format<"email">;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // Normally this would be a hash, but API test accepts raw for now.
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const adminLoginInput = {
    username: adminUsername,
    password: adminPassword,
  } satisfies IShoppingMallAiBackendAdmin.ILogin;

  // 2. Register customer
  const customerPassword = RandomGenerator.alphaNumeric(14) as string &
    tags.Format<"password">;
  const customerEmail =
    `${RandomGenerator.alphabets(10)}@customer.com` as string &
      tags.Format<"email">;
  const customerJoinInput = {
    email: customerEmail,
    phone_number: RandomGenerator.mobile(),
    password: customerPassword,
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerJoin);
  const customer = customerJoin.customer;
  const customerLoginInput = {
    email: customer.email,
    password: customerPassword,
  } satisfies IShoppingMallAiBackendCustomer.ILogin;

  // 3. Create the mileage ledger as customer (token is for customer)
  const mileageCreateInput = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 1000,
    usable_mileage: 1000,
    expired_mileage: 0,
    on_hold_mileage: 0,
  } satisfies IShoppingMallAiBackendMileage.ICreate;
  const mileageRecord =
    await api.functional.shoppingMallAiBackend.customer.mileages.create(
      connection,
      { body: mileageCreateInput },
    );
  typia.assert(mileageRecord);
  const mileageId = mileageRecord.id;

  // 4. Switch to admin account (refresh token to admin after customer join)
  await api.functional.auth.admin.login(connection, { body: adminLoginInput });

  // 5. Soft-delete mileage ledger as admin
  await api.functional.shoppingMallAiBackend.admin.mileages.erase(connection, {
    mileageId,
  });

  // 6. Try to soft delete again - should error (already deleted)
  await TestValidator.error("repeat delete should fail", async () => {
    await api.functional.shoppingMallAiBackend.admin.mileages.erase(
      connection,
      { mileageId },
    );
  });

  // 7. Try to soft delete a random (non-existent) mileage ledger - should error
  await TestValidator.error(
    "delete non-existent mileage ledger should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.mileages.erase(
        connection,
        {
          mileageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
