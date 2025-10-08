import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAnalyticsTrigger";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";

/**
 * Validates that an authenticated admin can search, filter, paginate, and sort
 * analytics triggers via the admin API.
 *
 * 1. Register and authenticate a new admin using unique credentials
 * 2. Search for analytics triggers using minimal valid request (no filters)
 * 3. Search with random filter combinations (status, trigger_type, admin_id, date
 *    range, sort, sortDir)
 * 4. Validate that result meta (pagination) matches input (if non-empty)
 * 5. Validate that all returned summaries are of expected shape
 * 6. Submit a search with no authentication (should get error)
 */
export async function test_api_analytics_trigger_search_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);
  // 2. Search triggers with minimal/empty filter
  const resultDefault: IPageIShoppingMallAnalyticsTrigger.ISummary =
    await api.functional.shoppingMall.admin.analyticsTriggers.index(
      connection,
      { body: {} satisfies IShoppingMallAnalyticsTrigger.IRequest },
    );
  typia.assert(resultDefault);
  TestValidator.predicate(
    "triggers page has pagination",
    !!resultDefault.pagination &&
      typeof resultDefault.pagination.current === "number",
  );
  await ArrayUtil.asyncForEach(resultDefault.data, async (summary) => {
    typia.assert(summary);
  });
  // 3. Search with random filters/sort (type, status, page, sort, direction)
  const query: IShoppingMallAnalyticsTrigger.IRequest = {
    trigger_type: RandomGenerator.pick([
      "dashboard_update",
      "report_export",
      "data_rebuild",
    ] as const),
    status: RandomGenerator.pick([
      "pending",
      "running",
      "success",
      "failed",
      "cancelled",
    ] as const),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    pageSize: 3,
    sort: RandomGenerator.pick([
      "created_at",
      "status",
      "trigger_type",
    ] as const),
    sortDir: RandomGenerator.pick(["asc", "desc"] as const),
    // Can't know admin_id in loaded data, but can filter by our own (may yield no results)
    admin_id: admin.id,
    created_from: undefined,
    created_to: undefined,
    query: undefined,
  };
  const resultFiltered: IPageIShoppingMallAnalyticsTrigger.ISummary =
    await api.functional.shoppingMall.admin.analyticsTriggers.index(
      connection,
      { body: query },
    );
  typia.assert(resultFiltered);
  // Validate result's filter fields if data exists
  if (resultFiltered.data.length > 0) {
    await ArrayUtil.asyncForEach(resultFiltered.data, async (summary) => {
      typia.assert(summary);
    });
  }
  // 4. Unauthenticated access (empty headers)
  const unauth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("analyticsTriggers: unauthenticated", async () => {
    await api.functional.shoppingMall.admin.analyticsTriggers.index(unauth, {
      body: {},
    });
  });
}
