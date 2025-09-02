import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_customer_logical_delete_idempotency(
  connection: api.IConnection,
) {
  /**
   * This test verifies that logical deletion (withdrawal) of a customer by an
   * admin is idempotent and compliant with data retention policy.
   *
   * Business context: Admins must be able to perform logical deletion (sets
   * deleted_at) on accounts without physical data loss. Deleting multiple times
   * must not throw error, and data must remain for audit purposes.
   *
   * Steps:
   *
   * 1. Register an admin and store credentials.
   * 2. Register a customer (to be deleted).
   * 3. (If needed) Log in as admin for proper role context.
   * 4. Delete the customer logically via admin endpoint (erase).
   * 5. Delete the same customer again to verify idempotency (should not throw
   *    error).
   * 6. Optionally: Validate customer record is present and deleted_at field is set
   *    (if fetch/read API present).
   */

  // 1. Register an admin
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminUsername = RandomGenerator.name().replace(/\s/g, "").toLowerCase();
  const adminEmail = `${adminUsername}@admin.example.com`;
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(),
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminReg);

  // 2. Register a customer
  const customerPassword = RandomGenerator.alphaNumeric(10) as string &
    tags.Format<"password">;
  const customerEmail =
    `${RandomGenerator.name().replace(/\s/g, "").toLowerCase()}@customer.example.com` as string &
      tags.Format<"email">;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: null,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer);
  const customerId = customer.customer.id;

  // 3. (If needed) login as admin to ensure Authorization header for admin role (explicit re-login)
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 4. Delete (logically withdraw) the customer as admin
  await api.functional.shoppingMallAiBackend.admin.customers.erase(connection, {
    customerId,
  }); // void return

  // 5. Delete again - idempotency check, must not fail
  await api.functional.shoppingMallAiBackend.admin.customers.erase(connection, {
    customerId,
  }); // void return, must not throw

  // 6. (No customer fetch endpoint is exposed in allowed functions. If it were present, would verify deleted_at is set.)
}
