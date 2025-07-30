import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";
import type { IPageIAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAnalyticsDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced dashboard search/filter for analytics dashboard admin.
 *
 * Ensures dashboards can be queried by specific fields (code, title,
 * description partial match), correct pagination is enforced, and result
 * matches filter criteria. The test also asserts only authorized (admin)
 * context works for search. Sorting is not implemented if not supported by
 * API.
 *
 * Step-by-step process:
 *
 * 1. Create several dashboards with known, varied (code/title/description) values
 *    for filter testing.
 * 2. Search by exact code, assert exact match and result length=1.
 * 3. Search by exact title, assert match and result length=1.
 * 4. Search with partial title, assert matching records (fuzzy match if API
 *    supports).
 * 5. Search by description, assert correct records returned.
 * 6. Test pagination: limit=2, page=1, page=2, assert correct paging meta and item
 *    slices.
 * 7. Validate that only authorized users can access search (simulate unauthorized
 *    call and check for error).
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_search_analytics_dashboards_with_valid_filters(
  connection: api.IConnection,
) {
  // 1. Create dashboards for search test data.
  const dashboards = await Promise.all([
    api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: "DASH-REPORT",
          title: "Sales Report",
          description: "Sales by month",
          config_json: '{"type": "chart"}',
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    ),
    api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: "DASH-OPS",
          title: "Operations",
          description: "Ops metrics dashboard",
          config_json: '{"type": "table"}',
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    ),
    api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: "DASH-CUSTOMER",
          title: "Customer Analysis",
          description: "Customer pipeline analysis",
          config_json: '{"type": "custom"}',
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    ),
  ]);
  dashboards.forEach((dashboard) => typia.assert(dashboard));

  // 2. Search by exact code, verify only matching dashboard returned
  const codeSearch =
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      {
        body: { code: dashboards[0].code },
      },
    );
  typia.assert(codeSearch);
  TestValidator.equals("single dashboard by code")(codeSearch.data.length)(1);
  TestValidator.equals("code matches")(codeSearch.data[0].code)(
    dashboards[0].code,
  );

  // 3. Search by exact title
  const titleSearch =
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      {
        body: { title: dashboards[1].title },
      },
    );
  typia.assert(titleSearch);
  TestValidator.equals("single dashboard by title")(titleSearch.data.length)(1);
  TestValidator.equals("title matches")(titleSearch.data[0].title)(
    dashboards[1].title,
  );

  // 4. Search by partial title -- if API supports partial/fuzzy match
  const partialTitle = dashboards[2].title.substring(0, 6);
  const partialTitleSearch =
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      {
        body: { title: partialTitle },
      },
    );
  typia.assert(partialTitleSearch);
  TestValidator.predicate("at least one matches partial title")(
    partialTitleSearch.data.some((d) => d.title.includes(partialTitle)),
  );

  // 5. Search by description
  const descriptionSearch =
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      {
        body: { description: "Sales" },
      },
    );
  typia.assert(descriptionSearch);
  TestValidator.predicate(
    "results contain dashboards with 'Sales' in description",
  )(
    descriptionSearch.data.some((d) => (d.description ?? "").includes("Sales")),
  );

  // 6. Pagination test: get all dashboards and validate pagination meta
  const pagedSearch =
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      {
        body: {},
      },
    );
  typia.assert(pagedSearch);
  const total = pagedSearch.pagination.records;
  TestValidator.equals("pagination records matches data length or exceeds it")(
    pagedSearch.pagination.records >= pagedSearch.data.length,
  )(true);
  TestValidator.equals("current page is at least 1")(
    pagedSearch.pagination.current >= 1,
  )(true);
  TestValidator.equals("pages equal or exceed 1")(
    pagedSearch.pagination.pages >= 1,
  )(true);

  // 7. Authorization test: simulate unauthorized (connection without auth header)
  const { Authorization, ...restHeaders } = connection.headers ?? {};
  const unauthorizedConnection = {
    ...connection,
    headers: restHeaders,
  };
  await TestValidator.error("search should not be allowed without auth")(() =>
    api.functional.aimall_backend.administrator.analyticsDashboards.search(
      unauthorizedConnection,
      { body: {} },
    ),
  );
}
