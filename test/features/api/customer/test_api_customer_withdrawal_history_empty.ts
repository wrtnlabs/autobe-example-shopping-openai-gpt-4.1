import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import type { IPageIShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerWithdrawal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_withdrawal_history_empty(
  connection: api.IConnection,
) {
  /**
   * Validate that a newly registered customer has an empty withdrawal (account
   * deactivation) history.
   *
   * This ensures that after registration—but before any withdrawal—the
   * withdrawal history endpoint returns an empty list without errors.
   *
   * Steps:
   *
   * 1. Generate registration data and register a customer using
   *    api.functional.auth.customer.join.
   * 2. On success, extract the customer id. (Authentication token is set in the
   *    connection.)
   * 3. Immediately call the withdrawal history API using the new customer id and
   *    an empty IRequest body.
   * 4. Assert the data array is empty and pagination records is 0, proving no
   *    withdrawal history exists.
   */
  // 1. Register new customer
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "T3stPassword!123", // Tag-compliant strong password
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const registration = await api.functional.auth.customer.join(connection, {
    body: registerInput,
  });
  typia.assert(registration);
  const customerId = registration.customer.id;

  // 2. Query withdrawal history (should be empty)
  const result =
    await api.functional.shoppingMallAiBackend.customer.customers.withdrawals.index(
      connection,
      {
        customerId,
        body: {},
      },
    );
  typia.assert(result);
  // 3. Assert withdrawal list and record count are both zero
  TestValidator.equals(
    "withdrawal list should be empty",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "withdrawal record count should be zero",
    result.pagination.records,
    0,
  );
}
