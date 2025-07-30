import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate that unauthorized (non-administrator) users cannot create analytics
 * dashboard configurations.
 *
 * Business context:
 *
 * - The analytics dashboard setup operation is restricted to administrators for
 *   compliance and audit reasons.
 * - Any attempt by a non-admin or user without sufficient privileges must be
 *   rejected by the API with an authorization error.
 *
 * Test steps:
 *
 * 1. Attempt to create an analytics dashboard entity using a connection that is
 *    not authenticated as an administrator (simulate a regular user or an
 *    anonymous request).
 * 2. Validate that the API call is rejected with an authorization error (typically
 *    HTTP 401/403).
 * 3. Ensure that no dashboard entity is created on the backend for the non-admin
 *    attempt.
 *
 * This test ensures that access control is correctly enforced for critical
 * configuration operations.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_create_analytics_dashboard_without_proper_authorization(
  connection: api.IConnection,
) {
  // 1. Prepare a (potentially anonymous or non-admin) connection context
  // (Assume the 'connection' parameter does not hold admin credentials)

  // 2. Attempt to create a dashboard with valid configuration payload
  const dashboardInput: IAimallBackendAnalyticsDashboard.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(),
    config_json: JSON.stringify({
      widgets: [{ type: "chart", id: "main_chart" }],
    }),
  };

  // 3. Expect and assert authorization error from the backend
  await TestValidator.error("unauthorized create should fail")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: dashboardInput,
      },
    );
  });
}
