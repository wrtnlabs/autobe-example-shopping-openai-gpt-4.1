import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that searching/filtering for external accounts linked to a customer
 * with criteria that yield no matches returns an empty list and correct
 * pagination.
 *
 * Business context: Administrators need to audit or search for
 * federated/external authentication links for customers. It must be validated
 * that, when applying search criteria that cannot possibly match any records
 * (such as non-existent provider, non-existent user ID, or obviously
 * out-of-bounds dates), the system responds with an empty list and explicit
 * zero pagination metadata (records/pages), not with an error or ambiguous
 * payload.
 *
 * Step-by-step:
 *
 * 1. Register a customer with required onboarding fields.
 * 2. Link a real external Google account to that customer.
 * 3. Admin attempts filtered searches for impossible matches: a. Search for a
 *    provider that is not linked to customer. b. Search by an external_user_id
 *    that does not exist. c. Search by a linked_from in the distant future. d.
 *    Search by a linked_to in the distant past. e. Combine impossible filters.
 *    For each search, verify the data array is empty, and pagination records,
 *    pages, and reasonable limit are correct.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_search_external_accounts_with_no_results(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Link a Google account
  const externalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: typia.random<string>(),
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(externalAccount);

  // 3a. Search - non-existent provider
  const resultByProvider =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "apple",
        },
      },
    );
  typia.assert(resultByProvider);
  TestValidator.equals("empty data for non-existent provider")(
    resultByProvider.data,
  )([]);
  TestValidator.equals("zero records")(resultByProvider.pagination.records)(0);
  TestValidator.equals("zero pages")(resultByProvider.pagination.pages)(0);

  // 3b. Search - non-existent external_user_id
  const resultByExternalUserId =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          external_user_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(resultByExternalUserId);
  TestValidator.equals("empty data for non-existent external_user_id")(
    resultByExternalUserId.data,
  )([]);
  TestValidator.equals("zero records")(
    resultByExternalUserId.pagination.records,
  )(0);
  TestValidator.equals("zero pages")(resultByExternalUserId.pagination.pages)(
    0,
  );

  // 3c. Search - linked_from in the distant future
  const resultByFutureFrom =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          linked_from: "2100-01-01T00:00:00.000Z",
        },
      },
    );
  typia.assert(resultByFutureFrom);
  TestValidator.equals("empty data for future linked_from")(
    resultByFutureFrom.data,
  )([]);
  TestValidator.equals("zero records")(resultByFutureFrom.pagination.records)(
    0,
  );
  TestValidator.equals("zero pages")(resultByFutureFrom.pagination.pages)(0);

  // 3d. Search - linked_to in the distant past
  const resultByPastTo =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          linked_to: "2000-01-01T00:00:00.000Z",
        },
      },
    );
  typia.assert(resultByPastTo);
  TestValidator.equals("empty data for past linked_to")(resultByPastTo.data)(
    [],
  );
  TestValidator.equals("zero records")(resultByPastTo.pagination.records)(0);
  TestValidator.equals("zero pages")(resultByPastTo.pagination.pages)(0);

  // 3e. Search - impossible combination
  const resultByImpossibleCombination =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "kakao",
          linked_from: "2099-12-31T23:59:59.999Z",
          linked_to: "2000-01-01T00:00:00.000Z",
          external_user_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(resultByImpossibleCombination);
  TestValidator.equals("empty data for impossible filters")(
    resultByImpossibleCombination.data,
  )([]);
  TestValidator.equals("zero records")(
    resultByImpossibleCombination.pagination.records,
  )(0);
  TestValidator.equals("zero pages")(
    resultByImpossibleCombination.pagination.pages,
  )(0);

  // Extra check: pagination.limit is present and >0 (default provided by backend)
  TestValidator.predicate("pagination.limit positive")(
    resultByImpossibleCombination.pagination.limit > 0,
  );
}
