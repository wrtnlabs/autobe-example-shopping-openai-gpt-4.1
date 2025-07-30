import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate backend input validation for the advanced order search endpoint when
 * passed invalid filter parameters.
 *
 * Business context: This API powers admin order search/filter UIs. Robust
 * backend parameter validation is required to ensure that UI mistakes,
 * unsupported values, or user tinkering with unknown parameters do not cause
 * unexpected errors or data leakage. Business logic must enforce strict status
 * value sets and logical ranges for date fields.
 *
 * Test Steps:
 *
 * 1. Attempt to search for orders using an unsupported status string (e.g.
 *    'unicorn') and expect a validation error (422 or appropriate error
 *    response).
 * 2. Attempt to search with an illogical date range (created_at_to is before
 *    created_at_from) and expect a validation error response.
 * 3. Verify that meaningful error messages or status codes are returned (do not
 *    assert error string but require HTTP error and failed outcome).
 * 4. Confirm that when errors occur, no data is returned and backend does not leak
 *    unintended information.
 */
export async function test_api_aimall_backend_administrator_orders_test_search_orders_with_invalid_filter_parameters(
  connection: api.IConnection,
) {
  // 1. Search with unsupported order_status value
  await TestValidator.error("invalid order_status rejects")(() =>
    api.functional.aimall_backend.administrator.orders.search(connection, {
      body: {
        order_status: "unicorn", // unsupported status string
      },
    }),
  );

  // 2. Search with illogical date range (created_at_to < created_at_from)
  const from = "2025-07-29T10:00:00.000Z";
  const to = "2025-07-28T10:00:00.000Z";
  await TestValidator.error("date range logic validation")(() =>
    api.functional.aimall_backend.administrator.orders.search(connection, {
      body: {
        created_at_from: from,
        created_at_to: to,
      },
    }),
  );
}
