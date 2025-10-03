import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDeposit";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";

/**
 * Validate that the admin deposit search/filter/pagination endpoint functions
 * correctly.
 *
 * 1. Register a new admin (becomes authenticated via returned token)
 * 2. Register a new customer
 * 3. As the customer, create a deposit account (with known starting
 *    balance/status)
 * 4. Switch back to admin context
 * 5. Search via the admin endpoint with various filters: a. By status b. By
 *    customer ID c. By min/max balance d. With pagination params (limit/page)
 * 6. Validate admin receives expected/paged deposit, that response structure
 *    matches summary DTO, and that all filter combinations work
 * 7. Attempt search with non-admin session to confirm access is denied
 */
export async function test_api_admin_deposit_account_search_pagination(
  connection: api.IConnection,
) {
  // 1. Register/admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "12345678",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register customer user
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "87654321",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 3. As the customer, create deposit account
  const depositStatus = "active";
  const depositBalance = 10100;
  await api.functional.shoppingMall.customer.deposits.create(connection, {
    body: {
      shopping_mall_customer_id: customerJoin.id,
      balance: depositBalance,
      status: depositStatus,
    } satisfies IShoppingMallDeposit.ICreate,
  });

  // 4. Switch back to admin context (already authenticated from step 1, still valid)
  // 5a. Search by customer ID and status
  let response = await api.functional.shoppingMall.admin.deposits.index(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerJoin.id,
        status: depositStatus,
      } satisfies IShoppingMallDeposit.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "admin deposit search returns correct customer deposit",
    response.data.length > 0 &&
      response.data.some(
        (d) =>
          d.shopping_mall_customer_id === customerJoin.id &&
          d.status === depositStatus,
      ),
  );

  // 5b. Search with min_balance (should find the deposit)
  response = await api.functional.shoppingMall.admin.deposits.index(
    connection,
    {
      body: {
        min_balance: depositBalance,
        status: depositStatus,
      } satisfies IShoppingMallDeposit.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "min_balance filter returns deposit",
    response.data.length > 0 &&
      response.data.some((d) => d.balance >= depositBalance),
  );

  // 5c. Search with max_balance too low (should return no results)
  response = await api.functional.shoppingMall.admin.deposits.index(
    connection,
    {
      body: {
        max_balance: depositBalance - 1,
        status: depositStatus,
      } satisfies IShoppingMallDeposit.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "no deposits should match max_balance < actual",
    response.data.length,
    0,
  );

  // 5d. Paginate with limit=1, expect a single record and correct pagination
  response = await api.functional.shoppingMall.admin.deposits.index(
    connection,
    {
      body: {
        limit: 1 as number,
        status: depositStatus,
      } satisfies IShoppingMallDeposit.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination limit works",
    response.data.length,
    Math.min(1, response.pagination.records),
  );
  TestValidator.equals(
    "pagination.links matches page",
    response.pagination.limit,
    1,
  );

  // 6. Attempt search as customer (access denied expected)
  // Switch to customer session via auth join
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "87654321",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });

  await TestValidator.error(
    "non-admin user cannot access admin deposit search",
    async () => {
      await api.functional.shoppingMall.admin.deposits.index(connection, {
        body: {} satisfies IShoppingMallDeposit.IRequest,
      });
    },
  );
}
