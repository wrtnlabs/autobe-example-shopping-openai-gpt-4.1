import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import type { IPageIShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerWithdrawal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_customer_withdrawals_list_nonexistent_customer(
  connection: api.IConnection,
) {
  /**
   * Test retrieval of withdrawal history for a nonexistent or deleted customer
   * as admin.
   *
   * This function verifies admin attempts to access sensitive withdrawal
   * information using a random UUID that does not identify any customer (either
   * never existed or has been deleted). It asserts that the API enforces proper
   * access control, no sensitive data is returned, and that the failure is
   * handled in a compliant way.
   *
   * Steps:
   *
   * 1. Register an admin account using api.functional.auth.admin.join (with random
   *    registration data).
   * 2. Attempt to fetch the withdrawal history for a random customerId (not linked
   *    to any real customer)
   *
   * - Use api.functional.shoppingMallAiBackend.admin.customers.withdrawals.index
   *   with a random customerId and standard filter object.
   *
   * 3. Assert using TestValidator.error that this does not expose sensitive data
   *    and returns a not-found or proper error response.
   */

  // 1. Register a new admin account to get admin authentication context
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Generate a UUID unlikely to exist as a customer
  const randomNonexistentCustomerId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  const requestBody: IShoppingMallAiBackendCustomerWithdrawal.IRequest = {};

  // 3. Assert that attempting to fetch withdrawal history throws a proper error (not-found or forbidden)
  await TestValidator.error(
    "should not retrieve withdrawals for nonexistent customer (not-found or forbidden error)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.withdrawals.index(
        connection,
        {
          customerId: randomNonexistentCustomerId,
          body: requestBody,
        },
      );
    },
  );
}
