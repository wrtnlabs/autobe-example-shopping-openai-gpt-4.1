import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that searching for comments using a filter known to produce no results
 * returns an empty array and correct pagination metadata, with no errors.
 *
 * This test covers two cases:
 *
 * 1. Searching by a random, non-existent customer_id (author) filter
 * 2. Searching with an impossible date range (created_at_from > created_at_to)
 *
 * In both cases, the API should:
 *
 * - Return data: [] (no results)
 * - Have pagination metadata with records: 0, pages: 0
 * - Not throw or return errors
 *
 * Steps:
 *
 * 1. PATCH /aimall-backend/administrator/comments with random customer_id
 *
 *    - Expect empty results and correct pagination
 * 2. PATCH /aimall-backend/administrator/comments with impossible date range
 *
 *    - Expect empty results and correct pagination
 */
export async function test_api_aimall_backend_administrator_comments_search_returns_empty_for_no_match(
  connection: api.IConnection,
) {
  // 1. Search with a non-existent customer_id (random UUID)
  const customerIdFilter = typia.random<string & tags.Format<"uuid">>();
  const result1 =
    await api.functional.aimall_backend.administrator.comments.search(
      connection,
      {
        body: { customer_id: customerIdFilter },
      },
    );
  typia.assert(result1);
  TestValidator.equals("no results for unknown customer")(result1.data)([]);
  TestValidator.equals("pagination.records for unknown customer")(
    result1.pagination.records,
  )(0);
  TestValidator.equals("pagination.pages for unknown customer")(
    result1.pagination.pages,
  )(0);
  // Default pagination values
  TestValidator.equals("pagination.current default")(
    result1.pagination.current,
  )(1);
  TestValidator.equals("pagination.limit default")(result1.pagination.limit)(
    10,
  );

  // 2. Search with an impossible date range
  const impossibleFrom = "2029-01-01T00:00:00Z";
  const impossibleTo = "2022-01-01T00:00:00Z";
  const result2 =
    await api.functional.aimall_backend.administrator.comments.search(
      connection,
      {
        body: { created_at_from: impossibleFrom, created_at_to: impossibleTo },
      },
    );
  typia.assert(result2);
  TestValidator.equals("no results for impossible date range")(result2.data)(
    [],
  );
  TestValidator.equals("pagination.records for impossible date range")(
    result2.pagination.records,
  )(0);
  TestValidator.equals("pagination.pages for impossible date range")(
    result2.pagination.pages,
  )(0);
  TestValidator.equals("pagination.current default")(
    result2.pagination.current,
  )(1);
  TestValidator.equals("pagination.limit default")(result2.pagination.limit)(
    10,
  );
}
