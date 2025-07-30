import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";
import type { IPageIAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAbuseIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate input filtering errors for advanced abuse incident search (admin
 * dashboard).
 *
 * This test ensures the backend properly rejects invalid search filter input
 * for abuse incidents, such as an invalid value for type (e.g., non-string or
 * unrecognized string), and malformed detected_at date ranges (e.g., non-ISO
 * format or impossible dates). The endpoint should respond with a validation
 * error, without leaking or returning any data. This behavior confirms robust
 * input validation and correct error feedback for compliance/admin tooling.
 *
 * Steps:
 *
 * 1. Attempt search with an invalid type value (e.g., number instead of string)
 *    and confirm a validation error is thrown (no records returned).
 * 2. Attempt search with malformed detected_at_from and detected_at_to (e.g.,
 *    non-ISO strings) and confirm a validation error is thrown (no records
 *    returned).
 * 3. Attempt search with detected_at_from after detected_at_to (chronologically
 *    impossible) and confirm a validation error is thrown (no data/leakage).
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_search_abuse_incidents_invalid_filter_error(
  connection: api.IConnection,
) {
  // 1. Invalid type (number, should be string or null)
  await TestValidator.error("rejects non-string type filter")(() =>
    api.functional.aimall_backend.administrator.abuseIncidents.search(
      connection,
      {
        body: {
          type: 1234 as unknown as string, // purposely invalid type for negative test
        },
      },
    ),
  );

  // 2. Malformed detected_at_from and detected_at_to (non-ISO strings)
  await TestValidator.error("rejects malformed date strings")(() =>
    api.functional.aimall_backend.administrator.abuseIncidents.search(
      connection,
      {
        body: {
          detected_at_from: "not-an-iso-date" as any,
          detected_at_to: "20251399T99:99:99" as any,
        },
      },
    ),
  );

  // 3. Impossible date range (from after to)
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60);
  await TestValidator.error("rejects detected_at_from after detected_at_to")(
    () =>
      api.functional.aimall_backend.administrator.abuseIncidents.search(
        connection,
        {
          body: {
            detected_at_from: later.toISOString(),
            detected_at_to: now.toISOString(),
          },
        },
      ),
  );
}
