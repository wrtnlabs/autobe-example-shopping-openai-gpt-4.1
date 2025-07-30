import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate paginated querying of snapshot records in large result sets.
 *
 * This test verifies that when the admin queries the snapshot listing endpoint:
 *
 * - Pagination accurately slices the dataset according to specified page/limit
 * - Navigation across multiple pages returns the correct records for each page
 * - Sorting by 'created_at' produces consistent ordering
 * - When requesting a page number greater than total available, an empty set is
 *   returned without error
 *
 * Test scenario:
 *
 * 1. Request the first page of snapshots with a small `limit` (e.g., 2).
 * 2. Retrieve the total page count from pagination meta.
 * 3. Iterate through the first few pages, confirming each page's records do not
 *    overlap and are sorted as expected.
 * 4. Request an out-of-bounds high page number (e.g., current pages + 10) and
 *    confirm data set is empty (no error).
 *
 * Edge cases:
 *
 * - If no data is present at all, the test should still pass by verifying the
 *   total is 0 and all pages return empty data without error.
 */
export async function test_api_aimall_backend_administrator_snapshots_search_with_large_result_set_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Request the first page with small limit (2)
  const pageSize = 2;
  const firstPage =
    await api.functional.aimall_backend.administrator.snapshots.search(
      connection,
      {
        body: {
          limit: pageSize,
          page: 1,
        },
      },
    );
  typia.assert(firstPage);
  const { pagination, data } = firstPage;
  TestValidator.equals("page is 1")(pagination?.current)(1);
  TestValidator.equals("limit matches")(pagination?.limit)(pageSize);

  if (pagination && data && data.length > 0) {
    // Step 2: Retrieve total number of pages
    const totalPages = pagination.pages ?? 1;
    // Step 3: Iterate through up to first 3 pages, confirming unique data/ids
    let seenIds = new Set<string>();
    let prevCreatedAts: string[] = [];
    for (let p = 1; p <= Math.min(3, totalPages); ++p) {
      const result =
        await api.functional.aimall_backend.administrator.snapshots.search(
          connection,
          {
            body: {
              limit: pageSize,
              page: p,
            },
          },
        );
      typia.assert(result);
      TestValidator.equals(`page matches request`)(result.pagination?.current)(
        p,
      );
      TestValidator.equals(`limit matches`)(result.pagination?.limit)(pageSize);
      if (result.data) {
        // Ensure no overlap between ids found on different pages
        for (const snap of result.data) {
          if (seenIds.has(snap.id)) {
            throw new Error(`Duplicate id found across pages: ${snap.id}`);
          }
          seenIds.add(snap.id);
        }
        // Confirm sorting by created_at descending (or at least consistent)
        const createdAts = result.data.map((snap) => snap.created_at);
        if (prevCreatedAts.length > 0 && createdAts.length > 0) {
          // Verify latest from this page is <= earliest from last page
          TestValidator.predicate("created_at order is consistent")(
            createdAts[0] <= prevCreatedAts[prevCreatedAts.length - 1],
          );
        }
        prevCreatedAts = createdAts;
      }
    }
    // Step 4: Request a page beyond available range
    const outOfBoundsPage = totalPages + 10;
    const emptyResult =
      await api.functional.aimall_backend.administrator.snapshots.search(
        connection,
        {
          body: {
            limit: pageSize,
            page: outOfBoundsPage,
          },
        },
      );
    typia.assert(emptyResult);
    TestValidator.equals("empty data on out-of-bounds page")(
      emptyResult.data?.length ?? 0,
    )(0);
  } else {
    // Edge: No data in DB; verify correct handling
    TestValidator.equals("no records")(pagination?.records)(0);
    TestValidator.equals("empty data")(data?.length ?? 0)(0);
  }
}
