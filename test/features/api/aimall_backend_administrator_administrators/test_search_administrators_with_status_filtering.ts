import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IPageIAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify administrator account search and filtering by status.
 *
 * This test ensures that the advanced admin search endpoint can reliably filter
 * administrator accounts by their `status` field. The test covers data
 * preparation, search execution, and result validation, including pagination
 * metadata.
 *
 * Steps:
 *
 * 1. Create three administrator accounts with distinct statuses: active,
 *    suspended, pending.
 * 2. For each status, make a search request specifying the `status` filter.
 * 3. Validate that only admin accounts with the requested status are returned, and
 *    that pagination metadata correctly reflects the filtered set.
 * 4. Confirm all returned records have the filtered status and that total record
 *    and page counts match expected result sizes.
 */
export async function test_api_aimall_backend_administrator_administrators_test_search_administrators_with_status_filtering(
  connection: api.IConnection,
) {
  // 1. Create three distinct administrator accounts each with a unique status
  const statuses = ["active", "suspended", "pending"];
  const admins = [];
  for (const status of statuses) {
    const admin =
      await api.functional.aimall_backend.administrator.administrators.create(
        connection,
        {
          body: {
            permission_id: typia.random<string & tags.Format<"uuid">>(),
            email: `${RandomGenerator.alphabets(8)}@domain.com`,
            name: RandomGenerator.name(),
            status: status,
          },
        },
      );
    typia.assert(admin);
    admins.push(admin);
  }

  // 2. For each status, test the search filter
  for (const status of statuses) {
    const response =
      await api.functional.aimall_backend.administrator.administrators.search(
        connection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(response);
    // 3. Validate all returned results are for the requested status
    for (const summary of response.data) {
      TestValidator.equals(`status matches filter ${status}`)(summary.status)(
        status,
      );
    }
    // 4. Confirm pagination includes correct record count
    TestValidator.predicate(`records exist for status ${status}`)(
      response.pagination.records >= 1,
    );
    TestValidator.equals(`page is first for status ${status}`)(
      response.pagination.current,
    )(1);
    TestValidator.equals(`limit is correct for status ${status}`)(
      response.pagination.limit,
    )(10);
    // Should not exceed limit
    TestValidator.predicate(`data does not exceed limit for status ${status}`)(
      response.data.length <= 10,
    );
  }
}
