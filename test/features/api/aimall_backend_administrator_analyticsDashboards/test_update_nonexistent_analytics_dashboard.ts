import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Test error handling when updating a non-existent analytics dashboard by ID.
 *
 * Business rationale: Attempting to update an analytics dashboard with an ID
 * that does not exist in the system (either because it was never created or has
 * already been deleted) should result in a clear not found error. The endpoint
 * must not create a new dashboard, nor should it alter any other resource.
 *
 * Workflow:
 *
 * 1. Generate a random UUID (ensuring it does not correspond to any defined
 *    analytics dashboard).
 * 2. Attempt to call the update API with this random UUID and a random/valid
 *    update body.
 * 3. Validate that the API responds with a not found error (typically HTTP 404).
 * 4. Confirm that no new dashboard has been created as a side-effect.
 *
 * Edge/Negative Case: Error must occur regardless of input body content (even
 * if valid).
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_update_nonexistent_analytics_dashboard(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent dashboard
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a valid update body (randomized, but valid against IUpdate DTO)
  const updateBody = typia.random<IAimallBackendAnalyticsDashboard.IUpdate>();

  // 3. Attempt the update – should throw not found error (e.g., HTTP 404)
  await TestValidator.error("not found error")(() =>
    api.functional.aimall_backend.administrator.analyticsDashboards.update(
      connection,
      {
        analyticsDashboardId: nonexistentId,
        body: updateBody,
      },
    ),
  );

  // 4. No further assertions possible (side-effect checks would require a list/read endpoint not available)
}
