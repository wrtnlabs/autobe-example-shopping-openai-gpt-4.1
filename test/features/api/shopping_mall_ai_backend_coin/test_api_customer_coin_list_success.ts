import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import type { IPageIShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoin";
import type { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";

/**
 * Test retrieving a paginated, filtered list of the authenticated
 * customer's coin ledgers.
 *
 * Business Context: Customers have digital coin ledgers in the system (for
 * points, store credits, etc.) and need to be able to see their wallet
 * pages. This test ensures that, after customer registration and coin
 * ledger creation, a customer can use the search/list endpoint and only see
 * their own ledgers, with proper pagination and filtering.
 *
 * Steps:
 *
 * 1. Customer account registration ('/auth/customer/join') — this both creates
 *    and authenticates the test customer.
 * 2. Coin ledger creation for the customer
 *    ('/shoppingMallAiBackend/customer/coins', POST) — this ensures at
 *    least one ledger exists, associated with the test customer.
 * 3. Retrieve list of ledgers via '/shoppingMallAiBackend/customer/coins'
 *    PATCH endpoint with filter/search parameters (e.g., filter by customer
 *    id, page 1, limit 10).
 * 4. Validate response structure/type, and that only ledgers for the test
 *    customer are returned. Pagination metadata should also be consistent
 *    with test data size and filter.
 * 5. Assert that all returned ledgers' shopping_mall_ai_backend_customer_id
 *    match test customer id. No ledgers for other customers appear.
 *    Response data and pagination metadata is type-correct.
 * 6. Assert that the recently created ledger ID is included in the result set.
 * 7. Assert that pagination.records matches actual data length if result is
 *    within single page.
 */
export async function test_api_customer_coin_list_success(
  connection: api.IConnection,
) {
  // 1. Customer account registration
  const customerJoin: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: "123456qwer!",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerJoin);
  const customer = customerJoin.customer;
  typia.assert(customer);
  // 2. Coin ledger creation for this customer
  const createdLedger: IShoppingMallAiBackendCoin =
    await api.functional.shoppingMallAiBackend.customer.coins.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          total_accrued: 1000,
          usable_coin: 800,
          expired_coin: 100,
          on_hold_coin: 100,
        } satisfies IShoppingMallAiBackendCoin.ICreate,
      },
    );
  typia.assert(createdLedger);
  // 3. Retrieve list of ledgers with pagination, filtering by customer id
  const response: IPageIShoppingMallAiBackendCoin =
    await api.functional.shoppingMallAiBackend.customer.coins.index(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendCoin.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure and that ledgers are only for this customer
  TestValidator.predicate(
    "Response contains at least one ledger for this customer",
    response.data.length > 0,
  );
  for (const ledger of response.data) {
    typia.assert(ledger);
    TestValidator.equals(
      "Ledger belongs to the test customer",
      ledger.shopping_mall_ai_backend_customer_id,
      customer.id,
    );
  }
  // 5. Assert that the created ledger ID is included in the results
  const returnedLedgerIds = response.data.map((l) => l.id);
  TestValidator.predicate(
    "Created ledger ID is present in returned data",
    returnedLedgerIds.includes(createdLedger.id),
  );
  // 6. Check pagination metadata is consistent
  const pagination = response.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "Pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("Pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "Pagination records is at least response data length",
    pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "Pagination pages is at least 1",
    pagination.pages >= 1,
  );
  // 7. If pagination.records <= limit, actual returned data length should equal records
  if (pagination.records <= pagination.limit) {
    TestValidator.equals(
      "Returned data length equals records when within one page",
      response.data.length,
      pagination.records,
    );
  }
}
