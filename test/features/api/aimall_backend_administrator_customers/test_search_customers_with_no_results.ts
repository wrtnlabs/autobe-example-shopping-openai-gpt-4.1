import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin customer search returns empty results when filters do not
 * match any customer records.
 *
 * This test ensures that when an administrator uses the customer search
 * endpoint with filtering parameters guaranteed not to match any customer (such
 * as a freshly generated random email or creation dates entirely in the
 * future), the API correctly responds with an empty data array and provides
 * valid pagination metadata indicating zero matches.
 *
 * Steps:
 *
 * 1. Prepare a set of non-matching search criteria, for example:
 *
 *    - A random email address not present in the database
 *    - Or, use a created_from date in the future so no customers qualify
 * 2. Invoke the admin customer search API (`PATCH
 *    /aimall-backend/administrator/customers`) with selected filter.
 * 3. Assert the response structure conforms to
 *    IPageIAimallBackendCustomer.ISummary
 * 4. Confirm the `data` array is empty (length zero)
 * 5. Check the pagination metadata: records=0, pages=0 or 1 (depending on backend
 *    convention), current and limit as requested or as API default
 */
export async function test_api_aimall_backend_administrator_customers_test_search_customers_with_no_results(
  connection: api.IConnection,
) {
  // 1. Prepare a customer filter guaranteed to match no users
  const nonExistentEmail = `${RandomGenerator.alphaNumeric(12)}@nomatch-domain.test`;
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // one year in future

  // 2. Search with non-existent email
  const outputByEmail =
    await api.functional.aimall_backend.administrator.customers.search(
      connection,
      {
        body: {
          email: nonExistentEmail,
        },
      },
    );
  typia.assert(outputByEmail);
  TestValidator.equals("empty result for non-existent email")(
    outputByEmail.data.length,
  )(0);
  TestValidator.equals("pagination: records=0")(
    outputByEmail.pagination.records,
  )(0);

  // 3. Search with a future creation window
  const outputByFutureDate =
    await api.functional.aimall_backend.administrator.customers.search(
      connection,
      {
        body: {
          created_from: futureDate,
        },
      },
    );
  typia.assert(outputByFutureDate);
  TestValidator.equals("empty result for future creation")(
    outputByFutureDate.data.length,
  )(0);
  TestValidator.equals("pagination: records=0")(
    outputByFutureDate.pagination.records,
  )(0);
}
