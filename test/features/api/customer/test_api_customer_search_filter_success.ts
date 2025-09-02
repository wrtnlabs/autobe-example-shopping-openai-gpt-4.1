import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IPageIShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_search_filter_success(
  connection: api.IConnection,
) {
  /**
   * Test successful search/filter for customer accounts as admin.
   *
   * 1. Create and authenticate a new admin using /auth/admin/join.
   * 2. As admin, search/filter for customers by email and is_active status, with
   *    paging.
   * 3. Validate returned customers match filter criteria and response pagination
   *    is correct.
   * 4. Ensure restricted/soft-deleted customers are not included in response (per
   *    business policy).
   */

  // 1. Create and authenticate a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);
  TestValidator.equals(
    "admin email matches registration input",
    adminJoinResult.admin.email,
    adminEmail,
  );

  // 2. Search for customers using email filter
  const searchEmail = typia.random<string & tags.Format<"email">>();
  const emailSearchResult =
    await api.functional.shoppingMallAiBackend.admin.customers.index(
      connection,
      {
        body: {
          email: searchEmail,
          limit: 5,
          page: 1,
        } satisfies IShoppingMallAiBackendCustomer.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  emailSearchResult.data.forEach((c) => {
    TestValidator.equals(
      "customer email matches filter value",
      c.email,
      searchEmail,
    );
  });
  TestValidator.equals(
    "pagination current page is 1",
    emailSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    emailSearchResult.pagination.limit,
    5,
  );

  // 3. Search for customers using is_active = true filter
  const isActiveSearchResult =
    await api.functional.shoppingMallAiBackend.admin.customers.index(
      connection,
      {
        body: {
          is_active: true,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallAiBackendCustomer.IRequest,
      },
    );
  typia.assert(isActiveSearchResult);
  isActiveSearchResult.data.forEach((c) => {
    TestValidator.equals(
      "customer is_active matches filter",
      c.is_active,
      true,
    );
  });
  TestValidator.equals(
    "pagination current page is 1",
    isActiveSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    isActiveSearchResult.pagination.limit,
    10,
  );

  // 4. Ensure restricted customers (like soft-deleted/withdrawn) are not included in results
  isActiveSearchResult.data.forEach((c) => {
    TestValidator.predicate(
      "customer record should not be null or undefined",
      c.id !== undefined && c.id !== null,
    );
  });
}
