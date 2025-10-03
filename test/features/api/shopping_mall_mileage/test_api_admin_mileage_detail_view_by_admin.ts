import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Validate that an admin can audit and view any user mileage (loyalty point)
 * account in detail using the mileageId via the admin interface.
 *
 * Steps:
 *
 * 1. Register as a new admin (using random valid credentials)
 * 2. Create a random user UUID to act as the customer for the mileage account
 * 3. Create a test mileage account for the random user UUID using the admin
 *    endpoint, with random balance, status, and expiry values
 * 4. Retrieve the mileage detail by the newly created mileageId via the admin
 *    detail endpoint
 * 5. Assert the returned entity contains all required fields and matches what was
 *    created (id, shopping_mall_customer_id, balance, status, expired_at |
 *    null, created_at, updated_at, deleted_at | null)
 * 6. Test error: look up a random non-existent (random uuid) mileageId (should
 *    error)
 * 7. Test permission: try viewing the record with an unauthenticated connection
 *    (should error/deny access)
 */
export async function test_api_admin_mileage_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as a new admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create a random customer UUID to simulate a user
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Admin creates a mileage account for the test customer
  const mileageBody = {
    shopping_mall_customer_id: customerId,
    balance: Math.floor(Math.random() * 10000),
    status: RandomGenerator.pick(["active", "expired", "frozen"] as const),
    expired_at:
      Math.random() > 0.5
        ? (new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 365,
          ).toISOString() as string & tags.Format<"date-time">)
        : null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    { body: mileageBody },
  );
  typia.assert(mileage);
  TestValidator.equals(
    "created mileage details match input",
    mileage.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "created mileage status matches input",
    mileage.status,
    mileageBody.status,
  );
  TestValidator.equals(
    "created mileage expired_at matches input",
    mileage.expired_at,
    mileageBody.expired_at,
  );
  TestValidator.equals(
    "created mileage balance matches input",
    mileage.balance,
    mileageBody.balance,
  );

  // 4. Retrieve detailed mileage as admin
  const detail = await api.functional.shoppingMall.admin.mileages.at(
    connection,
    { mileageId: mileage.id },
  );
  typia.assert(detail);
  TestValidator.equals("detail id matches created id", detail.id, mileage.id);
  TestValidator.equals(
    "detail shopping_mall_customer_id matches",
    detail.shopping_mall_customer_id,
    mileage.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "detail balance matches",
    detail.balance,
    mileage.balance,
  );
  TestValidator.equals("detail status matches", detail.status, mileage.status);
  TestValidator.equals(
    "detail expired_at matches",
    detail.expired_at,
    mileage.expired_at,
  );
  // The audit fields should exist
  TestValidator.predicate(
    "detail created_at exists",
    typeof detail.created_at === "string" && !!detail.created_at,
  );
  TestValidator.predicate(
    "detail updated_at exists",
    typeof detail.updated_at === "string" && !!detail.updated_at,
  );
  // deleted_at is nullable/undefined
  TestValidator.equals(
    "detail deleted_at is null or undefined after creation",
    detail.deleted_at,
    mileage.deleted_at,
  );

  // 5. Try look up with invalid (non-existent) id - should error
  await TestValidator.error(
    "lookup of random non-existent mileageId should fail",
    async () => {
      await api.functional.shoppingMall.admin.mileages.at(connection, {
        mileageId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Try unauthenticated access (connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin should not access mileage detail",
    async () => {
      await api.functional.shoppingMall.admin.mileages.at(unauthConn, {
        mileageId: mileage.id,
      });
    },
  );
}
