import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAuditLog";
import type { IPageIAimallBackendAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the audit log search API returns correct empty results with proper
 * pagination when no records match filters.
 *
 * Business context: Administrators often require the ability to search audit
 * logs with arbitrary filter criteria. When such searches result in no matching
 * data (e.g., due to a nonexistent event type or future date range), the API
 * must return a well-structured paginated response with an empty data array and
 * accurate pagination fields, ensuring robustness for interface clients and
 * automated systems.
 *
 * Test steps:
 *
 * 1. Search audit logs using an impossible event_type filter
 *
 *    - Confirm response contains empty data, pagination records/pages are zero, and
 *         page index is correct
 * 2. Search audit logs using a date range set entirely in the far future
 *
 *    - Confirm response contains empty data, pagination records/pages are zero, and
 *         page index is correct This protects against regressions in edge-case
 *         search/pagination logic.
 */
export async function test_api_aimall_backend_administrator_auditLogs_search_with_no_results(
  connection: api.IConnection,
) {
  // 1. Search audit logs by an impossible event_type
  const impossibleEventType = "NON_EXISTENT_EVENT_TYPE";
  const paramsImprobable: IAimallBackendAuditLog.IRequest = {
    page: 1,
    limit: 20,
    event_type: impossibleEventType,
  };
  const resultByType =
    await api.functional.aimall_backend.administrator.auditLogs.search(
      connection,
      { body: paramsImprobable },
    );
  typia.assert(resultByType);
  // Assertions for empty results via event type
  TestValidator.equals("empty result by event_type")(resultByType.data.length)(
    0,
  );
  TestValidator.equals("pagination.records by event_type")(
    resultByType.pagination.records,
  )(0);
  TestValidator.equals("pagination.pages by event_type")(
    resultByType.pagination.pages,
  )(0);
  TestValidator.equals("current page by event_type")(
    resultByType.pagination.current,
  )(paramsImprobable.page);

  // 2. Search audit logs by a far-future date range
  const now = new Date();
  const startFuture = new Date(now.getFullYear() + 10, 0, 1).toISOString();
  const endFuture = new Date(
    now.getFullYear() + 10,
    11,
    31,
    23,
    59,
    59,
  ).toISOString();
  const paramsFuture: IAimallBackendAuditLog.IRequest = {
    page: 1,
    limit: 20,
    start_at: startFuture,
    end_at: endFuture,
  };
  const resultByFuture =
    await api.functional.aimall_backend.administrator.auditLogs.search(
      connection,
      { body: paramsFuture },
    );
  typia.assert(resultByFuture);
  // Assertions for empty results via future date
  TestValidator.equals("empty result by date range")(
    resultByFuture.data.length,
  )(0);
  TestValidator.equals("pagination.records by date range")(
    resultByFuture.pagination.records,
  )(0);
  TestValidator.equals("pagination.pages by date range")(
    resultByFuture.pagination.pages,
  )(0);
  TestValidator.equals("current page by date range")(
    resultByFuture.pagination.current,
  )(paramsFuture.page);
}
