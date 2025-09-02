import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";

export async function test_api_admin_mileage_ledger_update_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin can update a customer's mileage ledger with proper audit
   * compliance.
   *
   * 1. Register a new admin (to test with privileged permissions and session
   *    context, using random credentials)
   * 2. Register a new customer (random credentials, isolated test data)
   * 3. Create an initial mileage ledger for the customer (as the customer)
   * 4. Retrieve the created mileage ledger's id and initial audit fields
   * 5. Switch back to admin context (login, using random credentials)
   * 6. Admin updates ledger fields (usable_mileage, expired_mileage,
   *    on_hold_mileage, and updated_at)
   * 7. Return from update, validate updated fields, confirm ledger id and audit
   *    checks
   */

  // 1. Register admin account and get admin credentials (randomized for test isolation)
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(7)}@admin.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminCreateResult);

  // 2. Register customer with randomized test data
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerEmail = `${RandomGenerator.alphaNumeric(7)}@customer.com`;
  const customerJoinResult = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerEmail,
        phone_number: RandomGenerator.mobile(),
        password: customerPassword,
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResult);
  const customerId = customerJoinResult.customer.id;

  // 3. (Customer context) Create initial mileage ledger
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });

  const initialMileage =
    await api.functional.shoppingMallAiBackend.customer.mileages.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          total_accrued: 1000,
          usable_mileage: 900,
          expired_mileage: 50,
          on_hold_mileage: 50,
          shopping_mall_ai_backend_seller_id: null,
        } satisfies IShoppingMallAiBackendMileage.ICreate,
      },
    );
  typia.assert(initialMileage);
  const mileageId = initialMileage.id;
  const initialCreatedAt = initialMileage.created_at;
  const initialDeletedAt = initialMileage.deleted_at ?? null;

  // 4. Switch to admin context for update
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 5. Admin updates balance fields
  const updateAt = new Date().toISOString();
  const updatedUsable = initialMileage.usable_mileage + 100;
  const updatedOnHold = initialMileage.on_hold_mileage + 10;
  const updatedExpired = initialMileage.expired_mileage + 5;
  const updateResult =
    await api.functional.shoppingMallAiBackend.admin.mileages.update(
      connection,
      {
        mileageId,
        body: {
          usable_mileage: updatedUsable,
          expired_mileage: updatedExpired,
          on_hold_mileage: updatedOnHold,
          updated_at: updateAt,
        } satisfies IShoppingMallAiBackendMileage.IUpdate,
      },
    );
  typia.assert(updateResult);

  // 6. Validation: field accuracy and audit field tracking
  TestValidator.equals(
    "usable_mileage updated by admin",
    updateResult.usable_mileage,
    updatedUsable,
  );
  TestValidator.equals(
    "expired_mileage updated by admin",
    updateResult.expired_mileage,
    updatedExpired,
  );
  TestValidator.equals(
    "on_hold_mileage updated by admin",
    updateResult.on_hold_mileage,
    updatedOnHold,
  );
  TestValidator.equals(
    "ledger id remains same after update",
    updateResult.id,
    mileageId,
  );
  TestValidator.equals(
    "audit updated_at field reflects the request timestamp",
    updateResult.updated_at,
    updateAt,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updateResult.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged after update",
    updateResult.deleted_at ?? null,
    initialDeletedAt,
  );
}
