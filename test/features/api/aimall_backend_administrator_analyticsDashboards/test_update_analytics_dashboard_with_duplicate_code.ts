import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validates uniqueness enforcement on analytics dashboard code updates.
 *
 * This test simulates an administrator workflow for preventing duplicate codes
 * among analytics dashboards. It first creates two dashboards with distinct
 * codes, then attempts to update the second dashboard's code to duplicate the
 * first's code. The update operation must fail due to the service's uniqueness
 * constraint on the code field.
 *
 * Business context: Administrative users must not be able to assign the same
 * code to more than one analytics dashboard. Uniqueness violations are
 * considered critical configuration errors.
 *
 * Steps performed:
 *
 * 1. Create dashboard A with a unique code ('codeA').
 * 2. Create dashboard B with a different unique code ('codeB').
 * 3. Attempt to update dashboard B, setting its code to 'codeA'.
 * 4. Validate that an error is thrown due to code uniqueness violation.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_update_analytics_dashboard_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create dashboard A with a unique code
  const codeA: string = RandomGenerator.alphabets(10);
  const dashboardA =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: codeA,
          title: RandomGenerator.paragraph()(),
          description: null,
          config_json: null,
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboardA);

  // 2. Create dashboard B with a different unique code
  const codeB: string = RandomGenerator.alphabets(10);
  const dashboardB =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: codeB,
          title: RandomGenerator.paragraph()(),
          description: null,
          config_json: null,
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboardB);

  // 3. Attempt to update dashboard B's code to the same as dashboard A (should fail)
  await TestValidator.error("should reject dashboard code duplication")(
    async () =>
      api.functional.aimall_backend.administrator.analyticsDashboards.update(
        connection,
        {
          analyticsDashboardId: dashboardB.id,
          body: {
            code: codeA,
          } satisfies IAimallBackendAnalyticsDashboard.IUpdate,
        },
      ),
  );
}
