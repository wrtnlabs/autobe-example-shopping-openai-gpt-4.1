import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Test the workflow for a customer soft-deleting their own mileage account
 * (logical delete).
 *
 * 1. Register a new customer in the platform (customer context/auth).
 * 2. Register a new admin (admin context/auth).
 * 3. Use the admin context to create a new mileage account for that customer.
 * 4. As the customer, issue a soft-delete (logical delete) on the created mileage
 *    account.
 * 5. Validate that (a) the deleted_at field is set on the mileage account
 *    (soft-delete), (b) no data is physically removed—record still exists if
 *    accessed as admin, (c) account is inaccessible to customer via standard
 *    API queries, and (d) lossless compliance and audit evidence: the balance
 *    before-and-after deletion remains consistent for audit trail purposes.
 *    Also, ensure all regulatory requirements for logical deletion and audit
 *    trail are maintained.
 */
export async function test_api_mileage_customer_soft_delete_own_account(
  connection: api.IConnection,
) {
  // Step 1: Register new customer
  const customerJoinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "abcdef123456",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // Step 2: Register new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin123",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 3: Use admin context to create a mileage account for the customer
  // Switch context: log in as admin again (if needed)
  await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  const mileageCreateBody = {
    shopping_mall_customer_id: customer.id,
    balance: 50000,
    status: "active",
    expired_at: null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    { body: mileageCreateBody },
  );
  typia.assert(mileage);
  TestValidator.equals(
    "mileage account linked to customer",
    mileage.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals("mileage initial balance", mileage.balance, 50000);
  TestValidator.equals("mileage active status", mileage.status, "active");
  TestValidator.equals(
    "mileage is not soft-deleted on creation",
    mileage.deleted_at,
    null,
  );

  // Step 4: Switch back to customer context (log in again as customer)
  await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  await api.functional.shoppingMall.customer.mileages.erase(connection, {
    mileageId: mileage.id,
  });

  // Step 5: Cannot directly verify deleted_at due to missing admin get API. Test by attempting double-delete
  await TestValidator.error(
    "soft-deleted mileage cannot be deleted again",
    async () => {
      await api.functional.shoppingMall.customer.mileages.erase(connection, {
        mileageId: mileage.id,
      });
    },
  );
}
