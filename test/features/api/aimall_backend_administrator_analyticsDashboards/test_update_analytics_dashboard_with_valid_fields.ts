import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate successful update of analytics dashboard configuration by
 * administrator.
 *
 * This test ensures that an administrator can successfully update an existing
 * analytics dashboard via the corresponding API endpoint, with valid and
 * realistic update data for updatable fields. The workflow covers the entire
 * business context: creating a dashboard first to obtain a valid dashboard ID,
 * performing the update action with a patch of updated fields (title,
 * description, config_json), and finally validating the returned entity against
 * expectations and uniqueness business rules.
 *
 * Step-by-step process:
 *
 * 1. Create an analytics dashboard – this serves as the prerequisite and provides
 *    a valid analyticsDashboardId for the update operation.
 * 2. Update the dashboard using the provided ID, modifying at least some of the
 *    updatable fields such as title, description, and config_json, using
 *    realistic update values that differ from the original.
 * 3. Verify that the response contains the correct, updated values, and the unique
 *    code remains unchanged unless intentionally updated (not required in this
 *    test).
 * 4. Assert type safety and schema compliance of all API responses with
 *    typia.assert().
 * 5. Optionally, re-fetch the dashboard and ensure the persisted changes are
 *    retrievable and match the update payload.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_update_analytics_dashboard_with_valid_fields(
  connection: api.IConnection,
) {
  // 1. Create an initial analytics dashboard (prerequisite for having a valid ID)
  const originalInput: IAimallBackendAnalyticsDashboard.ICreate = {
    code: RandomGenerator.alphabets(8),
    title: RandomGenerator.paragraph()(2),
    description: RandomGenerator.paragraph()(1),
    config_json: JSON.stringify({ layout: "single", widgets: [] }),
  };
  const created: IAimallBackendAnalyticsDashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: originalInput,
      },
    );
  typia.assert(created);

  // 2. Update the dashboard with new updatable fields
  const updateInput: IAimallBackendAnalyticsDashboard.IUpdate = {
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(1),
    config_json: JSON.stringify({ layout: "double", widgets: ["chart"] }),
  };
  const updated: IAimallBackendAnalyticsDashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.update(
      connection,
      {
        analyticsDashboardId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  // 3. Verify updated fields
  TestValidator.equals("title")(updated.title)(updateInput.title);
  TestValidator.equals("description")(updated.description)(
    updateInput.description,
  );
  TestValidator.equals("config_json")(updated.config_json)(
    updateInput.config_json,
  );
  // 4. Verify the code remains unchanged
  TestValidator.equals("code")(updated.code)(created.code);
}
