import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";
import type { IPageIShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendDepositTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_deposit_transactions_list_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful retrieval of a customer's deposit transaction
   * history.
   *
   * Steps:
   *
   * 1. Register a new customer and obtain authentication context.
   * 2. Simulate or obtain the test customer's deposit ledger ID (depositId).
   *
   *    - In a live E2E, depositId would be discovered; here we simulate for
   *         illustration.
   * 3. Issue PATCH query to
   *    /shoppingMallAiBackend/customer/deposits/{depositId}/transactions with a
   *    realistic filter/pagination body (e.g., recent 7 days, limit 5).
   * 4. Validate the returned result:
   *
   *    - All transactions have valid UUID ids.
   *    - If filterBody.change_type is specified, each transaction matches.
   *    - Created_at falls within the filter window for each transaction.
   *    - Pagination metadata present with correct structure and values.
   *    - All checks use TestValidator with descriptive messages.
   */

  // 1. Register customer and authenticate
  const input: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "Password!123",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: input });
  typia.assert(auth);
  const customerId = auth.customer.id;

  // 2. Simulate depositId (since no deposit creation/list API is present)
  // In a full E2E, this would be queried from another endpoint or set up via fixtures
  const depositId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Set query filter: 7-day range, pagination limit 5, for this deposit/customer
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const filterBody: IShoppingMallAiBackendDepositTransaction.IRequest = {
    page: 1,
    limit: 5,
    deposit_id: depositId,
    customer_id: customerId,
    change_type: null,
    created_from: weekAgo.toISOString(),
    created_to: now.toISOString(),
    description_query: null,
    seller_id: null,
  };

  // 4. Query deposit transaction list
  const output =
    await api.functional.shoppingMallAiBackend.customer.deposits.transactions.index(
      connection,
      {
        depositId,
        body: filterBody,
      },
    );
  typia.assert(output);

  // 5. Validate all transactions match UUID format and date filter, and (if specified) change_type
  for (const tx of output.data) {
    TestValidator.predicate(
      "transaction id is a valid uuid",
      typeof tx.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tx.id,
        ),
    );
    if (filterBody.change_type) {
      TestValidator.equals(
        "transaction change_type matches filter",
        tx.change_type,
        filterBody.change_type,
      );
    }
    TestValidator.predicate(
      "transaction created_at within date range",
      (!filterBody.created_from || tx.created_at >= filterBody.created_from) &&
        (!filterBody.created_to || tx.created_at <= filterBody.created_to),
    );
  }

  // 6. Validate pagination keys and values
  const pageKeys = Object.keys(output.pagination).sort();
  TestValidator.equals(
    "pagination contains correct keys",
    pageKeys,
    ["current", "limit", "pages", "records"].sort(),
  );
  TestValidator.equals(
    "pagination current page matches request",
    output.pagination.current,
    filterBody.page,
  );
  TestValidator.equals(
    "pagination page size matches request",
    output.pagination.limit,
    filterBody.limit,
  );
}
