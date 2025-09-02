import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import type { IPageIShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendMileage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_mileage_list_empty_result(
  connection: api.IConnection,
) {
  /**
   * Test the mileage ledger listing for a new customer with no mileage ledgers.
   *
   * This test ensures that immediately after registration (where mileage ledger
   * creation is not automatic), querying
   * /shoppingMallAiBackend/customer/mileages returns a valid (empty) page
   * structure—not an error—and correctly indicates zero ledgers for the
   * customer.
   *
   * Steps:
   *
   * 1. Register a new customer, guaranteeing a fresh account with no mileage
   *    ledgers.
   * 2. Authentication context is implicitly set by the join endpoint (token stored
   *    in connection.headers).
   * 3. Query the mileage ledgers list for this customer with default/empty
   *    criteria.
   * 4. Assert:
   *
   *    - Returned object matches IPageIShoppingMallAiBackendMileage.ISummary.
   *    - Field 'data' is an empty array ([]), meaning no mileage records.
   *    - Pagination field 'records' is zero.
   *    - Pagination field 'pages' is zero or one (to accommodate both zero-page and
   *         min-one-page systems).
   *    - No error occurs from valid, empty result.
   */

  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone_number = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name();
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResult);

  // 2. Authentication context is handled by SDK (join sets Authorization in connection)

  // 3. Query mileage ledger list (should be empty)
  const result =
    await api.functional.shoppingMallAiBackend.customer.mileages.index(
      connection,
      {
        body: {}, // Empty/default request: no specific pagination requested, gets page 1
      },
    );
  typia.assert(result);

  // 4. Validate results
  TestValidator.equals(
    "mileage ledger list should be empty for newly registered user",
    result.data,
    [],
  );
  TestValidator.equals(
    "mileage ledger result count (pagination.records) should be zero",
    result.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination.pages should be zero or one for empty result",
    result.pagination.pages === 0 || result.pagination.pages === 1,
  );
}
