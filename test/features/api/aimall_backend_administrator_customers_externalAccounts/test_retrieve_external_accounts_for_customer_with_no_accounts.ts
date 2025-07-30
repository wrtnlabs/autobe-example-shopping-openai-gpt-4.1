import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Test retrieval of external accounts for a customer with no linked external
 * accounts.
 *
 * This verifies that the administrator endpoint for external account retrieval
 * behaves correctly when used on a newly registered customer who has not yet
 * linked any external (OAuth/social) account, as can be the case for direct
 * signups. Business logic requires that the response contains an empty data
 * array and correct pagination (0 records, 0 pages), confirming no accounts are
 * found but no error is returned.
 *
 * Steps:
 *
 * 1. Register a new customer using the backend customer creation API.
 * 2. Retrieve external accounts for this customer via the administrator API.
 * 3. Assert the data array is empty and pagination fields show zero records.
 */
export async function test_api_aimall_backend_administrator_customers_externalaccounts_index_for_customer_with_no_accounts(
  connection: api.IConnection,
) {
  // 1. Register a new customer (no external accounts linked yet)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Retrieve external accounts for this customer
  const result =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(result);

  // 3. Assert no external accounts and correct pagination meta
  TestValidator.equals("external account data should be empty")(result.data)(
    [],
  );
  TestValidator.equals("pagination: no external accounts")(
    result.pagination.records,
  )(0);
  TestValidator.equals("pagination: no pages")(result.pagination.pages)(0);
}
