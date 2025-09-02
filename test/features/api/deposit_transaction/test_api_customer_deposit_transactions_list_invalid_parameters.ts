import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";
import type { IPageIShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendDepositTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test validation of error handling for invalid query parameters in the
 * deposit transaction listing endpoint.
 *
 * This test ensures that the PATCH
 * /shoppingMallAiBackend/customer/deposits/{depositId}/transactions API
 * endpoint properly rejects requests containing invalid filtering or
 * pagination parameters, rather than returning data or crashing.
 *
 * Business scenario:
 *
 * - A new customer registers using /auth/customer/join and obtains
 *   authentication credentials.
 * - The depositId for the test is obtained from the resulting customer
 *   entity's id (assumed to match deposit ledger for test).
 * - Multiple invalid queries are tested:
 *
 *   1. Negative page number.
 *   2. Excessively high limit value.
 *   3. Invalid or nonsense change_type value.
 *
 * Each case is checked to ensure the API returns an error (not a successful
 * list or server crash). The test expects the API to perform input
 * validation and respond with rejection for such requests.
 */
export async function test_api_customer_deposit_transactions_list_invalid_parameters(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer (with random information)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const depositId = typia.assert(authorized.customer.id); // For this test, assume depositId == customer.id

  // Step 2: Negative page number case
  await TestValidator.error("negative page number is rejected", async () => {
    await api.functional.shoppingMallAiBackend.customer.deposits.transactions.index(
      connection,
      {
        depositId,
        body: {
          page: -1,
        } satisfies IShoppingMallAiBackendDepositTransaction.IRequest,
      },
    );
  });

  // Step 3: Excessively high limit value
  await TestValidator.error("excessively high limit is rejected", async () => {
    await api.functional.shoppingMallAiBackend.customer.deposits.transactions.index(
      connection,
      {
        depositId,
        body: {
          limit: 1000000,
        } satisfies IShoppingMallAiBackendDepositTransaction.IRequest,
      },
    );
  });

  // Step 4: Invalid change_type in request
  await TestValidator.error("invalid change_type is rejected", async () => {
    await api.functional.shoppingMallAiBackend.customer.deposits.transactions.index(
      connection,
      {
        depositId,
        body: {
          change_type: "nonsense-type-that-should-fail",
        } satisfies IShoppingMallAiBackendDepositTransaction.IRequest,
      },
    );
  });
}
