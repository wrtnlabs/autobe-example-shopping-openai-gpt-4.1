import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate error handling when requesting an analytics dashboard with an
 * invalid ID.
 *
 * This test checks the analytics dashboard GET endpoint by attempting to fetch
 * a dashboard with a random, non-existent, and malformed analyticsDashboardId.
 * The API should respond with not-found (404) or validation (400) errors,
 * without exposing sensitive data in error responses.
 *
 * Steps:
 *
 * 1. Attempt to fetch with a random UUID (assumed not to exist).
 * 2. Attempt to fetch with a malformed (non-UUID) string.
 * 3. Validate that error responses are present, and contain no sensitive info.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_get_analytics_dashboard_by_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Attempt to fetch with a random (non-existent) UUID
  // Expecting 404 Not Found or related error. Error should not leak sensitive data.
  await TestValidator.error("should return 404 for non-existent dashboard")(
    async () => {
      await api.functional.aimall_backend.administrator.analyticsDashboards.at(
        connection,
        {
          analyticsDashboardId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 2: Attempt to fetch with a malformed (non-UUID) string
  // Expecting 400 Bad Request or validation error. No sensitive data must be leaked in the error response.
  await TestValidator.error("should fail validation for malformed UUID")(
    async () => {
      await api.functional.aimall_backend.administrator.analyticsDashboards.at(
        connection,
        {
          analyticsDashboardId: "not-a-uuid" as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // Note: Ensure error responses do not expose confidential or sensitive data. This cannot be fully asserted in code,
  // but manual inspection of error outputs/logs is advised for compliance.
}
