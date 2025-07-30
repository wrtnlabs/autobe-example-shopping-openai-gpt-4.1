import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator ability to search/filter a customer's external
 * accounts by provider and date range.
 *
 * This test covers the following sequence:
 *
 * 1. Register a customer account (email+phone+status set to active, no password
 *    for external accounts)
 * 2. As admin, link a Google external account to the customer (first)
 * 3. As admin, link an Apple external account to the customer (second)
 * 4. Perform a search as admin using provider='google' and a date interval
 *    covering the present session
 * 5. Confirm only the Google account appears, provider and customer_id match
 * 6. Confirm that searching for 'apple' gives only the Apple account
 *
 * This validates correct filtering by provider and date. Uses strictly typed
 * DTOs and SDK calls, no type violations, and ensures all outputs are checked
 * for business logic. Timestamp boundaries are handled by real time but cannot
 * control exact linked_at at creation. The test logic still differentiates
 * accounts by provider and order.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_search_external_accounts_by_provider_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = typia.random<string>();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Link a Google external account
  const googleExternalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: `gid_${RandomGenerator.alphaNumeric(12)}`,
        },
      },
    );
  typia.assert(googleExternalAccount);

  // 3. Link an Apple external account
  const appleExternalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "apple",
          external_user_id: `aid_${RandomGenerator.alphaNumeric(12)}`,
        },
      },
    );
  typia.assert(appleExternalAccount);

  // 4. Search for Google accounts created after test started
  const intervalStart = new Date(
    new Date().getTime() - 5 * 60000,
  ).toISOString(); // 5 min ago
  const intervalEnd = new Date(new Date().getTime() + 5 * 60000).toISOString(); // 5 min later
  const searchResult =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          linked_from: intervalStart,
          linked_to: intervalEnd,
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.equals("one Google account found")(searchResult.data.length)(1);
  const foundGoogle = searchResult.data[0];
  TestValidator.equals("provider is google")(foundGoogle.provider)("google");
  TestValidator.equals("customer id matches")(foundGoogle.customer_id)(
    customer.id,
  );

  // 5. Search for Apple accounts in same window
  const appleResult =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "apple",
          linked_from: intervalStart,
          linked_to: intervalEnd,
        },
      },
    );
  typia.assert(appleResult);
  TestValidator.equals("one Apple account found")(appleResult.data.length)(1);
  const foundApple = appleResult.data[0];
  TestValidator.equals("provider is apple")(foundApple.provider)("apple");
  TestValidator.equals("customer id matches")(foundApple.customer_id)(
    customer.id,
  );
}
