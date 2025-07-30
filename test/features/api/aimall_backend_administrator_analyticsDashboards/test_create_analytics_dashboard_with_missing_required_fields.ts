import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate failure scenarios and required-field checks for analytics dashboard
 * creation (admin API).
 *
 * This E2E test ensures that attempts to create new analytics dashboards with
 * missing required fields (such as missing `title` or `code`) are rejected by
 * the API with appropriate validation errors, and that valid creations with
 * only required fields (omitting optionals) succeed.
 *
 * Steps:
 *
 * 1. Attempt to create a dashboard with the required `title` omitted. Expect
 *    validation error.
 * 2. Attempt to create a dashboard with the required `code` omitted. Expect
 *    validation error.
 * 3. Attempt to create a minimal dashboard with only required fields. Expect
 *    success.
 * 4. Attempt to create a dashboard omitting the optional `config_json`. Expect
 *    success.
 *
 * For steps 1 and 2, creation must be blocked and a validation error returned.
 * For steps 3 and 4, the API should create the dashboard entity normally.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_create_analytics_dashboard_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Attempt creation without title (should fail)
  await TestValidator.error("missing title should fail")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: `test_dash_${RandomGenerator.alphaNumeric(8)}`,
          // title is omitted intentionally
          description: "Admin analytics dashboard test",
          config_json: "{}",
        } as any, // forced for negative test (compile-time type violation)
      },
    );
  });

  // 2. Attempt creation without code (should fail)
  await TestValidator.error("missing code should fail")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          // code is omitted intentionally
          title: "Test Dashboard",
          description: "Admin analytics dashboard test",
          config_json: "{}",
        } as any, // forced for negative test (compile-time type violation)
      },
    );
  });

  // 3. Valid creation with only required fields (should succeed)
  const code1 = `minimal_dash_${RandomGenerator.alphaNumeric(8)}`;
  const minimalDashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: code1,
          title: "Minimal Dashboard",
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(minimalDashboard);
  TestValidator.equals("minimal dashboard code")(minimalDashboard.code)(code1);
  TestValidator.equals("minimal dashboard title")(minimalDashboard.title)(
    "Minimal Dashboard",
  );

  // 4. Valid creation omitting only config_json (optional; should succeed)
  const code2 = `no_config_${RandomGenerator.alphaNumeric(8)}`;
  const missingConfigDashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: code2,
          title: "Dashboard Without Config",
          description: "This dashboard omits config_json",
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(missingConfigDashboard);
  TestValidator.equals("dashboard code")(missingConfigDashboard.code)(code2);
  TestValidator.equals("dashboard title")(missingConfigDashboard.title)(
    "Dashboard Without Config",
  );
}
