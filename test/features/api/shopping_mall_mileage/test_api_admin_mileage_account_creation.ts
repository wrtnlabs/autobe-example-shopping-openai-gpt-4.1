import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Test the creation of admin mileage (loyalty/point) accounts.
 *
 * This test verifies that authenticated admins can create mileage accounts for
 * a customer, duplicate creation is prevented for the same customer, and proper
 * permission is required.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin using /auth/admin/join (prerequisite for
 *    subsequent creation).
 * 2. Generate realistic shopping_mall_customer_id (UUID) to represent an existing
 *    customer.
 * 3. Prepare valid mileage account payload with positive balance, 'active' status,
 *    and an expiry date in the future (ISO8601).
 * 4. Call the /shoppingMall/admin/mileages API to create a new mileage account.
 * 5. Assert the returned IShoppingMallMileage matches input and has correct audit
 *    fields (created_at, updated_at, not deleted).
 * 6. Attempt to create a second mileage account for the same customer, expect
 *    error due to uniqueness constraint.
 * 7. Attempt mileage creation with a fresh unauthenticated connection, expect
 *    permission error.
 */
export async function test_api_admin_mileage_account_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "secureTestPassword123",
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Generate a target customer UUID (simulating existing customer)
  const shoppingMallCustomerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare valid mileage account payload
  const now = new Date();
  const expiry = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // +1 year
  const createBody = {
    shopping_mall_customer_id: shoppingMallCustomerId,
    balance: 10000,
    status: "active",
    expired_at: expiry,
  } satisfies IShoppingMallMileage.ICreate;

  // 4. Create new mileage account
  const mileage: IShoppingMallMileage =
    await api.functional.shoppingMall.admin.mileages.create(connection, {
      body: createBody,
    });
  typia.assert(mileage);
  TestValidator.equals(
    "mileage shopping_mall_customer_id matches input",
    mileage.shopping_mall_customer_id,
    shoppingMallCustomerId,
  );
  TestValidator.predicate("positive balance", mileage.balance > 0);
  TestValidator.equals("status is active", mileage.status, "active");
  if (mileage.expired_at !== null && mileage.expired_at !== undefined) {
    // The expiry should be greater than now, as string comparison is safe in ISO8601
    TestValidator.predicate(
      "expiry is in the future",
      mileage.expired_at > now.toISOString(),
    );
  }
  TestValidator.equals("not deleted", mileage.deleted_at, null);
  // Audit fields
  TestValidator.predicate(
    "created_at and updated_at are valid",
    typeof mileage.created_at === "string" &&
      typeof mileage.updated_at === "string",
  );

  // 5. Duplicate creation attempt
  await TestValidator.error(
    "should fail on duplicate mileage account for same customer",
    async () => {
      await api.functional.shoppingMall.admin.mileages.create(connection, {
        body: createBody,
      });
    },
  );

  // 6. Unprivileged/unauthenticated attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail when creating mileage account without admin login",
    async () => {
      await api.functional.shoppingMall.admin.mileages.create(unauthConn, {
        body: {
          shopping_mall_customer_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          balance: 5000,
          status: "active",
          expired_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 100,
          ).toISOString(),
        } satisfies IShoppingMallMileage.ICreate,
      });
    },
  );
}
