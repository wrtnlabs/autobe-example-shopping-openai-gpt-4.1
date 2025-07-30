import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate rejection when attempting to update an analytics dashboard with
 * missing required fields.
 *
 * This test ensures the API enforces the required presence of at least one
 * updatable field (such as 'title', 'code', etc) in the update payload. If a
 * request is made without any of these, the server should return a validation
 * error and not update the dashboard in any way.
 *
 * Test Workflow:
 *
 * 1. Create a valid analytics dashboard so there is a target to update
 *    (dependency, via POST).
 * 2. Attempt to update the dashboard with an empty object as the update payload.
 *
 *    - The request body will be `{}`.
 * 3. Expect the API to reject the request with a runtime validation error (such as
 *    400 or 422), not updating anything.
 * 4. (Skipped) Re-fetch the dashboard after the failed update attempt to confirm
 *    its data is unchanged (no GET endpoint available).
 *
 * Business Reason:
 *
 * - Required updatable fields must be provided when updating to avoid an
 *   ineffective no-op or partially malformed update.
 * - Lack of such fields should trigger a business validation error, preventing
 *   any changes and preserving dashboard integrity.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_update_analytics_dashboard_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Create a valid dashboard via dependency API
  const dashboardCreate =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.paragraph()(1),
          config_json: JSON.stringify({
            widgets: [{ type: "chart", id: RandomGenerator.alphabets(4) }],
          }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboardCreate);

  // 2. Attempt update with completely empty object (no updatable fields)
  await TestValidator.error("update with no fields fails")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.update(
      connection,
      {
        analyticsDashboardId: dashboardCreate.id,
        body: {} satisfies IAimallBackendAnalyticsDashboard.IUpdate,
      },
    );
  });

  // 3. (Skipped) Fetch dashboard again to verify it is unchanged as there is no GET endpoint.
}
