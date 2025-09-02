import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";

export async function test_api_customer_withdrawal_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validates correct retrieval of detailed customer withdrawal evidence
   * record.
   *
   * 1. Create a customer account and authenticate as customer
   * 2. Create an admin account and authenticate as admin
   * 3. As admin, erase (withdraw) the customer -- triggers withdrawal event
   * 4. As customer, attempt to retrieve their own withdrawal details
   * 5. Confirm that all data in the withdrawal record matches the customer
   *    identity and is internally consistent
   *
   * Business rationale: Ensures that audit evidence of withdrawal is correctly
   * recorded, permission boundaries enforced, and user flows are correctly
   * linked between customer and admin. Both the triggering and verification
   * side are exercised.
   */

  // --- 1. Register and login a new customer ---
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!@#";
  const customerPhone = RandomGenerator.mobile();
  const customerName = RandomGenerator.name();
  const customerNickname = RandomGenerator.name();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword as string & tags.Format<"password">,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.customer.id;

  // --- 2. Register and login an admin (permission to trigger withdrawal) ---
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // Used as cleartext for test, backend hashes securely
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Switch to admin authentication for withdrawal operation
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // --- 3. As admin, erase/withdraw the customer ---
  await api.functional.shoppingMallAiBackend.admin.customers.erase(connection, {
    customerId,
  });

  // --- 4. As customer, login to fetch their withdrawal record ---
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string & tags.Format<"password">,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  // The withdrawalId is expected to be customerId (1:1 relationship). If multiple, would fetch latest; here only one withdrawal is present.
  const withdrawalId = customerId;

  // --- 5. Retrieve detailed evidence for this withdrawal ---
  const withdrawal =
    await api.functional.shoppingMallAiBackend.customer.customers.withdrawals.at(
      connection,
      {
        customerId,
        withdrawalId,
      },
    );
  typia.assert(withdrawal);

  // --- 6. Validate withdrawal evidence content ---
  TestValidator.equals(
    "withdrawal.customer_id matches customer id",
    withdrawal.customer_id,
    customerId,
  );
  TestValidator.equals(
    "withdrawal.id matches withdrawalId",
    withdrawal.id,
    withdrawalId,
  );
  TestValidator.predicate(
    "withdrawal.withdrawn_at is ISO timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      withdrawal.withdrawn_at,
    ),
  );
  TestValidator.predicate(
    "withdrawal.created_at is ISO timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(withdrawal.created_at),
  );
  // Reason may be absent; just assert string or null
  TestValidator.predicate(
    "withdrawal.reason is string or null",
    withdrawal.reason === null || typeof withdrawal.reason === "string",
  );
}
