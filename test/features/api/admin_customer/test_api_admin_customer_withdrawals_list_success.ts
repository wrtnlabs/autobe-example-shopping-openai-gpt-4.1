import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import type { IPageIShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerWithdrawal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_customer_withdrawals_list_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for admin paginated customer withdrawal (deactivation) history
   * retrieval.
   *
   * Business workflow:
   *
   * 1. Register an admin to establish authentication context
   * 2. As admin, register a new customer
   * 3. Withdraw (logically delete) that customer
   * 4. List withdrawal history (should include the above event)
   * 5. Validate all type contracts and data relationships
   */
  // 1. Register an admin
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // Simulated hash
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@malladmin.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;
  // 2. Register a new customer as admin
  const customerPassword: string = RandomGenerator.alphaNumeric(14) + "A"; // Password format
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@testcustomer.com`,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customer = customerAuth.customer;
  // 3. Withdraw (logically delete) the customer via admin
  await api.functional.shoppingMallAiBackend.admin.customers.erase(connection, {
    customerId: customer.id,
  });
  // 4. List withdrawal history for this customer
  const withdrawalRes =
    await api.functional.shoppingMallAiBackend.admin.customers.withdrawals.index(
      connection,
      {
        customerId: customer.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendCustomerWithdrawal.IRequest,
      },
    );
  typia.assert(withdrawalRes);
  // 5. Validate that at least one withdrawal event is present and matches the customerId
  TestValidator.predicate(
    "withdrawal history includes at least one withdrawal entry",
    withdrawalRes.data.length >= 1,
  );
  const lastWithdrawal = withdrawalRes.data[0];
  TestValidator.equals(
    "withdrawal record customer_id matches the withdrawn customer",
    lastWithdrawal.customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "withdrawn_at in withdrawal record is an ISO 8601 datetime string",
    typeof lastWithdrawal.withdrawn_at === "string" &&
      !isNaN(Date.parse(lastWithdrawal.withdrawn_at)),
  );
}
