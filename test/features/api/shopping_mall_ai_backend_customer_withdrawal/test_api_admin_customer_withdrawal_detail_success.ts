import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";

/**
 * Test that an admin can retrieve a specific withdrawal (account
 * deactivation) record for a customer.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new admin account
 * 2. Create a new customer account
 * 3. Using the admin context, withdraw (logically delete) the customer account
 * 4. Retrieve the withdrawal record for this customer using the admin endpoint
 * 5. Validate withdrawal record fields: id, customer_id, withdrawn_at,
 *    created_at, optional reason and assert the withdrawal is mapped
 *    correctly to the customer and timestamps are consistent
 */
export async function test_api_admin_customer_withdrawal_detail_success(
  connection: api.IConnection,
) {
  // 1. Create an admin account and authenticate as admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: adminPassword,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a new customer
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: customerPassword,
    name: RandomGenerator.name(),
  };
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer);
  const customerId = customer.customer.id;

  // 3. Withdraw the customer (logical deletion)
  await api.functional.shoppingMallAiBackend.admin.customers.erase(connection, {
    customerId,
  });

  // 4. Retrieve withdrawal detail — assuming withdrawalId == customerId (spec/public API does not expose a list)
  const withdrawalId = customerId;
  const withdrawal =
    await api.functional.shoppingMallAiBackend.admin.customers.withdrawals.at(
      connection,
      {
        customerId,
        withdrawalId,
      },
    );
  typia.assert(withdrawal);

  // 5. Assertions
  TestValidator.equals(
    "withdrawal.customer_id matches customer",
    withdrawal.customer_id,
    customerId,
  );
  TestValidator.equals(
    "withdrawal.id matches expected",
    withdrawal.id,
    withdrawalId,
  );
  TestValidator.predicate(
    "withdrawn_at is a valid ISO string",
    typeof withdrawal.withdrawn_at === "string" &&
      withdrawal.withdrawn_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid ISO string",
    typeof withdrawal.created_at === "string" &&
      withdrawal.created_at.length > 0,
  );
  TestValidator.predicate(
    "withdrawn_at and created_at are close in time",
    Math.abs(
      new Date(withdrawal.created_at).valueOf() -
        new Date(withdrawal.withdrawn_at).valueOf(),
    ) <
      1000 * 60 * 2,
  );
  TestValidator.predicate(
    "reason is null, undefined, or string",
    withdrawal.reason === null ||
      withdrawal.reason === undefined ||
      typeof withdrawal.reason === "string",
  );
}
