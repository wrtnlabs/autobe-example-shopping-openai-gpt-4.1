import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_customer_logical_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Admin logical deletion (withdrawal) of customer account
   *
   * 1. Create an admin (for privileged delete operations)
   * 2. Create a customer (deletion target)
   * 3. Switch to admin role if needed
   * 4. Admin logically deletes the customer
   * 5. (Cannot re-fetch customer or test login-block/failure directly with current
   *    SDK) Scenario limitation: There is no customer authentication (login)
   *    endpoint available in provided SDK to truly validate that login is
   *    blocked after delete; this step is acknowledged but unimplementable.
   */

  // 1. Create an admin account
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminEmail: string = `${RandomGenerator.alphabets(10)}@admin.test`;
  const adminName: string = RandomGenerator.name();
  const adminPasswordHash: string = adminPassword; // For this test/API, hash = password

  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);
  const admin = adminJoinResult.admin;
  TestValidator.predicate("admin is active", admin.is_active);
  TestValidator.equals("admin deleted_at is null", admin.deleted_at, null);

  // 2. Create a customer account (deletion target)
  const customerPassword: string = RandomGenerator.alphaNumeric(12);
  const customerEmail: string = `${RandomGenerator.alphabets(10)}@customer.test`;
  const customerPhone: string = RandomGenerator.mobile();
  const customerName: string = RandomGenerator.name();
  const customerNickname: string = RandomGenerator.name();

  const customerJoinResult = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: customerEmail,
        phone_number: customerPhone,
        password: customerPassword,
        name: customerName,
        nickname: customerNickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResult);
  const customerId: string = customerJoinResult.customer.id;
  const customer = customerJoinResult.customer;
  TestValidator.predicate("customer is active after join", customer.is_active);
  TestValidator.equals(
    "customer deleted_at is null after join",
    customer.deleted_at,
    null,
  );

  // 3. Switch back to admin context to ensure correct role
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });
  // Connection now uses admin privileges

  // 4. Admin logically deletes customer (withdrawal)
  await api.functional.shoppingMallAiBackend.admin.customers.erase(connection, {
    customerId,
  });

  // 5. Scenario limitation: Cannot directly fetch deleted customer nor test login-block/failure due to missing endpoints for login or get (SDK limitation). These steps are acknowledged but not implemented.
}
