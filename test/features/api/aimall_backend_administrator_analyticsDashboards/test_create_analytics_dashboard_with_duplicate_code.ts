import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate API uniqueness constraint for analytics dashboard code.
 *
 * This test ensures the system prevents creation of multiple analytics
 * dashboard configurations using the same dashboard code. The workflow is:
 *
 * 1. Create a dashboard with a unique code (simulate admin creation).
 * 2. Attempt to create another dashboard with the exact same code.
 * 3. The second creation attempt must fail (error thrown), verifying enforcement
 *    of uniqueness constraint on the code field.
 *
 * This test is critical for data integrity—dashboard codes must be unique to
 * avoid ambiguous references and routing issues within analytics modules.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_create_analytics_dashboard_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create initial dashboard config with specific code
  const code = RandomGenerator.alphaNumeric(12);
  const baseInput: IAimallBackendAnalyticsDashboard.ICreate = {
    code,
    title: RandomGenerator.paragraph()(2),
    description: RandomGenerator.content()()(),
    config_json: JSON.stringify({ widgets: [RandomGenerator.alphaNumeric(8)] }),
  };
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      { body: baseInput },
    );
  typia.assert(dashboard);
  TestValidator.equals("dashboard code is correct")(dashboard.code)(code);

  // 2. Attempt to create another dashboard with the same code (should fail)
  const duplicateInput: IAimallBackendAnalyticsDashboard.ICreate = {
    code, // duplicate code triggers uniqueness error
    title: RandomGenerator.paragraph()(1),
    description: null,
    config_json: null,
  };
  await TestValidator.error("duplicate dashboard code is rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.analyticsDashboards.create(
        connection,
        { body: duplicateInput },
      );
    },
  );
}
