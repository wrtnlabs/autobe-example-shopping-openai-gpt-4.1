import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator external account search with invalid filter input.
 *
 * This test checks how the system handles broken or invalid parameters when an
 * administrator tries to query a customer's external accounts. It includes
 * several invalid request cases:
 *
 * - Negative page number
 * - Linked_from date is after linked_to (invalid range)
 *
 * Steps:
 *
 * 1. Register a customer
 * 2. For each kind of invalid filter, run the external accounts search and expect
 *    a validation error
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_search_external_accounts_with_invalid_input(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const newCustomer = await api.functional.aimall_backend.customers.create(
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
  typia.assert(newCustomer);

  // 2. Test case: negative page number
  await TestValidator.error("negative page number")(() =>
    api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: newCustomer.id,
        body: {
          page: -1,
        } satisfies IAIMallBackendExternalAccount.IRequest,
      },
    ),
  );

  // 3. Test case: linked_from is after linked_to (impossible date range)
  const fromDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const toDate = new Date().toISOString();
  await TestValidator.error("linked_from after linked_to")(() =>
    api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: newCustomer.id,
        body: {
          linked_from: fromDate,
          linked_to: toDate,
        } satisfies IAIMallBackendExternalAccount.IRequest,
      },
    ),
  );
}
