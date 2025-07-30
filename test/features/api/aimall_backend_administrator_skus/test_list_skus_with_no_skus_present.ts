import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test the edge case where the SKU table is empty and an administrator requests
 * the SKU list.
 *
 * This test ensures that when no SKUs exist in the catalog, the API returns an
 * empty 'data' array and correct pagination metadata, handling the empty list
 * scenario gracefully.
 *
 * Steps:
 *
 * 1. Precondition: Assume the test environment starts with an empty SKU master
 *    table.
 * 2. Send GET request to `/aimall-backend/administrator/skus` as an administrator.
 * 3. Assert that the response 'data' array is empty (no SKU records present).
 * 4. Assert that pagination metadata (`records`, `current`, `pages`, `limit`) is
 *    present and correct.
 *
 *    - `records` should be 0.
 *    - `pages` should be 0 or 1 depending on pagination model.
 *    - `current` should be at least 1.
 *    - `limit` should be greater than 0.
 */
export async function test_api_aimall_backend_administrator_skus_test_list_skus_with_no_skus_present(
  connection: api.IConnection,
) {
  // 1. Precondition: The database should be empty of SKU records.
  // (This is an environmental assumption for the test)

  // 2. Send GET request to fetch all SKUs as administrator
  const output =
    await api.functional.aimall_backend.administrator.skus.index(connection);
  typia.assert(output);

  // 3. Assert the SKU data array is empty
  TestValidator.equals("SKU data should be empty")(output.data)([]);

  // 4. Validate returned pagination metadata
  TestValidator.equals("total records should be zero")(
    output.pagination.records,
  )(0);
  TestValidator.predicate("current page should be at least 1")(
    output.pagination.current >= 1,
  );
  TestValidator.predicate("pages is 0 or 1 for empty dataset")(
    output.pagination.pages === 0 || output.pagination.pages === 1,
  );
  TestValidator.predicate("limit should be positive")(
    output.pagination.limit > 0,
  );
}
