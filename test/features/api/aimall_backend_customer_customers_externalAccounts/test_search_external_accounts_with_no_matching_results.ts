import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify search for external accounts (null-result scenario).
 *
 * This test checks that searching for external accounts linked to a customer,
 * using a filter for a provider that has never been linked, yields an empty
 * result set and correct pagination information—thus validating API handling
 * for 'no results found'.
 *
 * Business context: Users (customers) may link external accounts (like Google,
 * Kakao, or Apple). Sometimes clients/applications need to query which accounts
 * are linked for auditing, settings, or UI purposes. It is critical that the
 * API, when filtered for a provider that the customer has NOT linked (e.g.,
 * filtering for 'apple' when they linked only 'google'), properly returns an
 * empty array and a valid pagination meta (with 0 records, pages, etc.), not an
 * error or incorrect data.
 *
 * Test steps:
 *
 * 1. Register a customer (only link a 'google' provider account, never an 'apple'
 *    account).
 * 2. Link a 'google' external account to this customer.
 * 3. Search for external accounts with filter set to a provider that hasn't been
 *    linked (e.g., 'apple').
 * 4. Assert response: empty data array, pagination meta (records = 0, pages = 0),
 *    correct page and limit values.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_search_external_accounts_with_no_matching_results(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    status: "active",
    password_hash: null,
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // Step 2: Link only a 'google' external account
  const externalAccountInput: IAIMallBackendExternalAccount.ICreate = {
    provider: "google",
    external_user_id: RandomGenerator.alphaNumeric(18),
  };
  const externalAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: externalAccountInput,
      },
    );
  typia.assert(externalAccount);

  // Step 3: Search for external accounts with provider = 'apple' (never linked)
  const searchInput: IAIMallBackendExternalAccount.IRequest = {
    provider: "apple", // Filter by provider never linked
    external_user_id: null, // No filter on external_user_id
    linked_from: null, // No filter on linked_from
    linked_to: null, // No filter on linked_to
    limit: 10, // Test non-default pagination
    page: 1,
  };
  const searchResult =
    await api.functional.aimall_backend.customer.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: searchInput,
      },
    );
  typia.assert(searchResult);

  // Step 4: Assert response
  // Expect empty data array as there are no 'apple' external accounts
  TestValidator.equals("empty data array")(searchResult.data)([]);
  // Pagination should report zero records and zero pages
  TestValidator.equals("pagination zero records")(
    searchResult.pagination.records,
  )(0);
  TestValidator.equals("pagination zero pages")(searchResult.pagination.pages)(
    0,
  );
  // Current page and limit reflect the request
  TestValidator.equals("pagination current page")(
    searchResult.pagination.current,
  )(1);
  TestValidator.equals("pagination limit")(searchResult.pagination.limit)(10);
}
