import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Validates the admin-side soft deletion (logical removal) of a mileage
 * (loyalty/point) account.
 *
 * 1. Register an admin (to acquire token/context).
 * 2. Create a random mileage account for a (random) customer.
 * 3. Perform a soft delete on the newly created mileage account.
 * 4. Validate business logic: account's deleted_at field is set and account is
 *    excluded from active use.
 * 5. Attempt to delete the account again — should result in a business error
 *    (already deleted).
 */
export async function test_api_admin_mileage_account_soft_delete(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin and authenticate
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches",
    adminAuth.email,
    adminJoinInput.email,
  );
  TestValidator.equals(
    "admin name matches",
    adminAuth.name,
    adminJoinInput.name,
  );
  TestValidator.equals(
    "admin deleted_at should be null on join",
    adminAuth.deleted_at,
    null,
  );

  // Step 2: As admin, create a new mileage account for a (random) customer
  const mileageCreateInput = {
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
    balance: 10000,
    status: "active",
    expired_at: null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage: IShoppingMallMileage =
    await api.functional.shoppingMall.admin.mileages.create(connection, {
      body: mileageCreateInput,
    });
  typia.assert(mileage);
  TestValidator.equals(
    "mileage created with correct customer id",
    mileage.shopping_mall_customer_id,
    mileageCreateInput.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "mileage initial deleted_at is null",
    mileage.deleted_at,
    null,
  );

  // Step 3: Perform a soft delete
  await api.functional.shoppingMall.admin.mileages.erase(connection, {
    mileageId: mileage.id,
  });
  // No content returned, but business should have marked as deleted
  // (No get API for single mileage, so there's no further direct read.
  // If an index/search endpoint existed, would expect the deleted account is excluded.)

  // Step 4: Try to delete again, should error (already deleted)
  await TestValidator.error(
    "cannot erase already deleted mileage account",
    async () => {
      await api.functional.shoppingMall.admin.mileages.erase(connection, {
        mileageId: mileage.id,
      });
    },
  );
}
