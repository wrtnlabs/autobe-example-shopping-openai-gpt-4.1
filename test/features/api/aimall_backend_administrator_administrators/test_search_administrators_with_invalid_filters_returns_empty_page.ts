import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IPageIAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the administrator search endpoint correctly returns an empty
 * result set when queried with filters that do not match any existing
 * administrator accounts.
 *
 * This ensures the backend handles non-existent filter combinations and
 * provides proper pagination metadata when no results are found, which is
 * crucial for the administrator dashboard user experience and correct client
 * integration.
 *
 * Steps:
 *
 * 1. Compose an administrator search request with impossible or random criteria
 *    guaranteed not to match any admin record (e.g., random UUID, unregistered
 *    email, or status value(s) that are not expected to be used, such as a
 *    made-up status).
 * 2. Call the search API endpoint with these filters.
 * 3. Verify that the result `data` array is empty.
 * 4. Assert that pagination info exists and shows zero results and one page.
 */
export async function test_api_aimall_backend_administrator_administrators_test_search_administrators_with_invalid_filters_returns_empty_page(
  connection: api.IConnection,
) {
  // 1. Compose impossible or unique filters for search (no admin can match)
  const impossibleFilters = {
    email: `nonexistent_${typia.random<string & tags.Format<"uuid">>()}@invaliddomain.test`,
    status: "impossible_status_value",
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    name: "Definitely Not An Admin Name",
    page: 1,
    limit: 10,
  } satisfies IAimallBackendAdministrator.IRequest;

  // 2. Call the admin search endpoint with these filters
  const result =
    await api.functional.aimall_backend.administrator.administrators.search(
      connection,
      { body: impossibleFilters },
    );
  typia.assert(result);

  // 3. Verify that returned data is an empty array
  TestValidator.equals("result set must be empty")(result.data)([]);

  // 4. Validate pagination metadata: 0 results, 1 page (0 records fits in 1 page)
  TestValidator.equals("record count is zero")(result.pagination.records)(0);
  TestValidator.equals("current page is 1")(result.pagination.current)(1);
  TestValidator.equals("limit is 10")(result.pagination.limit)(10);
  TestValidator.equals("pages is 1")(result.pagination.pages)(1);
}
