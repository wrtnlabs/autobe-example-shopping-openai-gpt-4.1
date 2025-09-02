import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDeposit";
import type { IPageIShoppingMallAiBackendDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendDeposit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_deposit_list_success(
  connection: api.IConnection,
) {
  /**
   * E2E validation of admin deposit search with pagination/filtering.
   *
   * 1. Admin is created and authenticated.
   * 2. Two deposit ledgers are created (with different customer/seller IDs,
   *    balances).
   * 3. Patch list API is called without filters, confirm all created deposits are
   *    present in results and pagination is correct.
   * 4. Filter search by customer_id/seller_id and by min/max balance to verify
   *    filtering logic.
   * 5. Paginate/limit and verify correct number of deposits per page.
   * 6. Negative test: use invalid filters, confirm error or empty results.
   */
  // 1. Admin sign-up/authentication
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@admin.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // In a real environment, use a hash
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create two deposit ledgers for different entities (simulate customer/seller IDs)
  const customerId1 = typia.random<string & tags.Format<"uuid">>();
  const sellerId1 = typia.random<string & tags.Format<"uuid">>();
  const deposit1 =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId1,
          total_accrued: 2000,
          usable_balance: 1300,
          expired_balance: 50,
          on_hold_balance: 200,
        } satisfies IShoppingMallAiBackendDeposit.ICreate,
      },
    );
  typia.assert(deposit1);

  const deposit2 =
    await api.functional.shoppingMallAiBackend.admin.deposits.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_seller_id: sellerId1,
          total_accrued: 5800,
          usable_balance: 4100,
          expired_balance: 0,
          on_hold_balance: 10,
        } satisfies IShoppingMallAiBackendDeposit.ICreate,
      },
    );
  typia.assert(deposit2);

  // 3. Query all deposits - no filters
  const summaryAll =
    await api.functional.shoppingMallAiBackend.admin.deposits.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendDeposit.IRequest,
      },
    );
  typia.assert(summaryAll);
  TestValidator.predicate(
    "all created deposits are present in result",
    summaryAll.data.some((d) => d.id === deposit1.id) &&
      summaryAll.data.some((d) => d.id === deposit2.id),
  );
  TestValidator.predicate(
    "pagination fields present",
    typeof summaryAll.pagination.current === "number" &&
      typeof summaryAll.pagination.limit === "number" &&
      typeof summaryAll.pagination.records === "number" &&
      typeof summaryAll.pagination.pages === "number",
  );

  // 4. Filter by customer_id
  const filteredCustomer =
    await api.functional.shoppingMallAiBackend.admin.deposits.index(
      connection,
      {
        body: {
          customer_id: customerId1,
        } satisfies IShoppingMallAiBackendDeposit.IRequest,
      },
    );
  typia.assert(filteredCustomer);
  TestValidator.predicate(
    "customer_id filter limits to only customer deposit",
    filteredCustomer.data.length === 1 &&
      filteredCustomer.data[0].id === deposit1.id,
  );

  // 4b. Filter by seller_id
  const filteredSeller =
    await api.functional.shoppingMallAiBackend.admin.deposits.index(
      connection,
      {
        body: {
          seller_id: sellerId1,
        } satisfies IShoppingMallAiBackendDeposit.IRequest,
      },
    );
  typia.assert(filteredSeller);
  TestValidator.predicate(
    "seller_id filter limits to only seller deposit",
    filteredSeller.data.length === 1 &&
      filteredSeller.data[0].id === deposit2.id,
  );

  // 5. Min/max usable_balance filter
  const filteredBalance =
    await api.functional.shoppingMallAiBackend.admin.deposits.index(
      connection,
      {
        body: {
          min_usable_balance: 2000,
          max_usable_balance: 5000,
        } satisfies IShoppingMallAiBackendDeposit.IRequest,
      },
    );
  typia.assert(filteredBalance);
  TestValidator.predicate(
    "min/max usable_balance filter returns correct deposit(s)",
    filteredBalance.data.some((d) => d.id === deposit2.id),
  );

  // 6. Pagination test (limit)
  const paged = await api.functional.shoppingMallAiBackend.admin.deposits.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallAiBackendDeposit.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals("pagination limit respected", paged.data.length, 1);

  // 7. Negative: Query with invalid customer_id
  await TestValidator.error(
    "invalid customer_id filter returns empty or error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.deposits.index(
        connection,
        {
          body: {
            customer_id: "00000000-0000-0000-0000-000000000000" as string &
              tags.Format<"uuid">,
          } satisfies IShoppingMallAiBackendDeposit.IRequest,
        },
      );
    },
  );
}
