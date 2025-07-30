import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search and filtering of linked external accounts for a
 * customer.
 *
 * Covers the business flow:
 *
 * 1. Register a customer
 * 2. Link three external accounts (Google, Apple, Kakao) to the customer
 * 3. Search external accounts filtering by only "apple" with pagination enabled
 * 4. Verify only Apple-linked accounts appear in search output
 * 5. Confirm pagination metadata: records, current/limit/pages
 * 6. Ensure no unrelated providers (Google, Kakao) are present in search results
 * 7. Validate returned entity format, customer ID, and content
 *
 * Edge case: Also verifies that requesting an out-of-bounds (page 2) returns no
 * data
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_search_external_accounts_with_pagination_and_provider_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null, // external/OAuth registration (simulate social login for test)
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Link external accounts: Google, Apple, Kakao
  const providers = ["google", "apple", "kakao"];
  const createdAccounts = await ArrayUtil.asyncMap(providers)(
    async (provider) => {
      const externalAccount =
        await api.functional.aimall_backend.customer.customers.externalAccounts.create(
          connection,
          {
            customerId: customer.id,
            body: {
              provider,
              external_user_id: RandomGenerator.alphaNumeric(12),
            } satisfies IAIMallBackendExternalAccount.ICreate,
          },
        );
      typia.assert(externalAccount);
      return externalAccount;
    },
  );

  // 3. Search: filter only "apple" accounts, 1 per page (pagination test, page 1)
  const searchPage1 =
    await api.functional.aimall_backend.customer.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "apple",
          limit: 1,
          page: 1,
        } satisfies IAIMallBackendExternalAccount.IRequest,
      },
    );
  typia.assert(searchPage1);
  // Should return exactly one Apple account (since we only created one)
  TestValidator.equals("results: only 1 apple account in data")(
    searchPage1.data.length,
  )(1);
  TestValidator.equals("results: pagination current page")(
    searchPage1.pagination.current,
  )(1);
  TestValidator.equals("results: pagination limit")(
    searchPage1.pagination.limit,
  )(1);
  TestValidator.equals("results: total records")(
    searchPage1.pagination.records,
  )(1);
  TestValidator.equals("results: total pages")(searchPage1.pagination.pages)(1);
  // Validate only apple provider is in data
  for (const account of searchPage1.data) {
    TestValidator.equals("all results provider=apple")(account.provider)(
      "apple",
    );
    typia.assert(account);
    TestValidator.equals("customer_id matches")(account.customer_id)(
      customer.id,
    );
  }
  // No Google or Kakao accounts should be in data
  const forbiddenProviders = ["google", "kakao"];
  for (const forbidden of forbiddenProviders) {
    TestValidator.predicate(`no ${forbidden} provider in result`)(
      searchPage1.data.every((acc) => acc.provider !== forbidden),
    );
  }

  // 4. Edge case: request page 2, should return empty data array (since only one apple account exists)
  const searchPage2 =
    await api.functional.aimall_backend.customer.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "apple",
          limit: 1,
          page: 2,
        } satisfies IAIMallBackendExternalAccount.IRequest,
      },
    );
  typia.assert(searchPage2);
  TestValidator.equals("results: page 2 empty")(searchPage2.data.length)(0);
  TestValidator.equals("results: page 2 correct current")(
    searchPage2.pagination.current,
  )(2);
}
