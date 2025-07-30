import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IPageIAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate input validation for seller admin search with invalid filter
 * parameters.
 *
 * Ensures the /aimall-backend/administrator/sellers search endpoint correctly
 * rejects malformed or invalid filter fields—like out-of-bound page numbers,
 * invalid date formats, or non-business status codes—confirming robust input
 * validation and error handling. Also, validates a control case with minimally
 * valid filters succeeds as expected.
 *
 * Test steps:
 *
 * 1. Attempt search with negative page number (should cause validation error)
 * 2. Attempt search with malformed created_at_gte (should cause validation error)
 * 3. Attempt search with invalid status value (should cause validation error)
 * 4. Control: Attempt search with minimal valid filter (should succeed)
 */
export async function test_api_aimall_backend_administrator_sellers_test_invalid_search_filter_parameters_return_error(
  connection: api.IConnection,
) {
  // 1. Negative page number – should trigger input validation error
  await TestValidator.error("negative page must fail")(async () => {
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          page: -1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  });

  // 2. Malformed created_at_gte (not ISO date-time) – should trigger error
  await TestValidator.error("malformed created_at_gte must fail")(async () => {
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          created_at_gte: "invalid-date" as string & tags.Format<"date-time">,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  });

  // 3. Invalid status string – should trigger error
  await TestValidator.error("invalid status value must fail")(async () => {
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          status: "foo_bar_invalid",
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  });

  // 4. Control: minimal valid request – should succeed without error
  const output =
    await api.functional.aimall_backend.administrator.sellers.search(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(output);
}
