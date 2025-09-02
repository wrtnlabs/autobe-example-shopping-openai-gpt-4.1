import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";
import type { IPageIShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerWithdrawal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_withdrawal_history_success(
  connection: api.IConnection,
) {
  /**
   * Scenario:
   *
   * 1. Register a new customer account to establish authentication context and
   *    obtain a unique customerId.
   * 2. Immediately retrieve this customer's withdrawal (account deactivation)
   *    history via PATCH
   *    /shoppingMallAiBackend/customer/customers/{customerId}/withdrawals.
   * 3. Assert that the response has correct paginated structure, and that each
   *    event (if any) has required evidence (id, withdrawn_at, customer_id,
   *    reason).
   *
   *    - For each withdrawal event: check type/format of id (uuid), withdrawn_at
   *         (ISO), customer_id (matches our customer), and optional reason
   *         (string|null).
   *    - Confirm compliance for audit/evidence.
   *
   * Note: No withdrawal is triggered (API not present), so for a freshly joined
   * account, history will likely be empty.
   */
  // Step 1: Register new customer (establish unique user context)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "TestPassword123!",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const customerId = joinResult.customer.id;

  // Step 2: Retrieve withdrawal history for this customer
  const history =
    await api.functional.shoppingMallAiBackend.customer.customers.withdrawals.index(
      connection,
      {
        customerId,
        body: {} satisfies IShoppingMallAiBackendCustomerWithdrawal.IRequest,
      },
    );
  typia.assert(history);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "withdrawal history pagination present",
    typeof history.pagination === "object" && history.pagination.current >= 1,
  );

  // Step 4: Validate compliance fields for each withdrawal event (if any)
  for (const event of history.data) {
    // UUID format (simple regex check)
    TestValidator.predicate(
      "withdrawal event id is UUID format",
      typeof event.id === "string" && /^[0-9a-fA-F\-]{36}$/.test(event.id),
    );
    TestValidator.predicate(
      "withdrawal event customer_id is UUID format",
      typeof event.customer_id === "string" &&
        /^[0-9a-fA-F\-]{36}$/.test(event.customer_id),
    );
    // Date-time ISO compliance
    TestValidator.predicate(
      "withdrawal event withdrawn_at is date-time ISO",
      typeof event.withdrawn_at === "string" &&
        !Number.isNaN(Date.parse(event.withdrawn_at)),
    );
    // Customer id matches
    TestValidator.equals(
      "withdrawal event customer_id matches account",
      event.customer_id,
      customerId,
    );
    // Reason field is string or null
    TestValidator.predicate(
      "withdrawal event reason is string or null",
      event.reason === null || typeof event.reason === "string",
    );
  }
}
