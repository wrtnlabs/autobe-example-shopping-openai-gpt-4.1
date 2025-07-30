import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate admin API returns an empty snapshot list when none exist.
 *
 * This test ensures that when the administrator queries the paginated snapshot
 * endpoint at platform initialization (or after all have been removed), the
 * endpoint returns an empty data list and valid pagination metadata, without
 * error or ambiguous states. This is necessary to verify the clean bootstrapped
 * state and avoid confusion for admin users accessing an empty system.
 *
 * Steps:
 *
 * 1. Call the snapshots index endpoint as administrator
 * 2. Assert that response type matches IPageIAimallBackendSnapshot
 * 3. Assert that the data property is an empty array or undefined/null
 * 4. Optionally, verify that pagination metadata is present and reflects zero
 *    records
 */
export async function test_api_aimall_backend_administrator_snapshots_index_empty_list(
  connection: api.IConnection,
) {
  // 1. Call list API (should be no snapshots present)
  const output =
    await api.functional.aimall_backend.administrator.snapshots.index(
      connection,
    );
  typia.assert(output);

  // 2. Validate data property is empty/undefined/null
  TestValidator.predicate("data is empty or undefined/nullable")(
    output.data === undefined ||
      output.data === null ||
      output.data.length === 0,
  );

  // 3. Validate pagination property exists and reflects zero records
  if (output.pagination) {
    TestValidator.equals("current page is 1")(output.pagination.current)(1);
    TestValidator.equals("zero records")(output.pagination.records)(0);
    TestValidator.equals("zero pages")(output.pagination.pages)(0);
  }
}
