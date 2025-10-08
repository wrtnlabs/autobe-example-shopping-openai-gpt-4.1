import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformSetting";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSetting";

/**
 * Validate the admin dashboard's platform settings paginated listing and
 * filtering capability.
 *
 * 1. Register a new admin (required for dashboard endpoint)
 * 2. Query paginated platform settings list with default and filtered options
 * 3. Assert response structure and business logic correctness (pagination,
 *    filtering, empty/no-match case)
 */
export async function test_api_platform_settings_admin_dashboard_paginated_list(
  connection: api.IConnection,
) {
  // 1. Register a new admin to access the endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Retrieve all settings with default pagination
  const defaultRequest = {} satisfies IShoppingMallPlatformSetting.IRequest;
  const allSettings: IPageIShoppingMallPlatformSetting.ISummary =
    await api.functional.shoppingMall.admin.platformSettings.index(connection, {
      body: defaultRequest,
    });
  typia.assert(allSettings);
  TestValidator.predicate(
    "pagination metadata present",
    typeof allSettings.pagination.current === "number" &&
      typeof allSettings.pagination.limit === "number" &&
      typeof allSettings.pagination.records === "number" &&
      typeof allSettings.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(allSettings.data));

  // 3. If at least one setting record exists, further test filtering
  if (allSettings.data.length > 0) {
    const firstSetting = allSettings.data[0];
    typia.assert(firstSetting);
    // Partial site_title filter (simulate substring of site_title_ko)
    const filterSiteTitle = firstSetting.site_title_ko.substr(0, 3);
    const filteredRequest = {
      site_title: filterSiteTitle,
      limit: 10,
      order_by: "created_at",
      order_dir: "desc",
    } satisfies IShoppingMallPlatformSetting.IRequest;
    const filteredResult: IPageIShoppingMallPlatformSetting.ISummary =
      await api.functional.shoppingMall.admin.platformSettings.index(
        connection,
        {
          body: filteredRequest,
        },
      );
    typia.assert(filteredResult);
    TestValidator.predicate(
      "data is array (filtered)",
      Array.isArray(filteredResult.data),
    );
    TestValidator.predicate(
      "filtered data matches site_title substring",
      filteredResult.data.some((s) =>
        s.site_title_ko.includes(filterSiteTitle),
      ),
    );
    // 4. Future creation date filter (should yield empty set)
    const futureDate = new Date(
      Date.now() + 365 * 24 * 3600 * 1000,
    ).toISOString();
    const futureDateRequest = {
      created_from: futureDate,
    } satisfies IShoppingMallPlatformSetting.IRequest;
    const emptyResult: IPageIShoppingMallPlatformSetting.ISummary =
      await api.functional.shoppingMall.admin.platformSettings.index(
        connection,
        { body: futureDateRequest },
      );
    typia.assert(emptyResult);
    TestValidator.equals(
      "empty result with future created_from",
      emptyResult.data.length,
      0,
    );
    // 5. Paging: request 1-record per page
    const pagingRequest = {
      limit: 1 as number,
      page: 1 as number,
    } satisfies IShoppingMallPlatformSetting.IRequest;
    const pagedResult: IPageIShoppingMallPlatformSetting.ISummary =
      await api.functional.shoppingMall.admin.platformSettings.index(
        connection,
        { body: pagingRequest },
      );
    typia.assert(pagedResult);
    TestValidator.equals(
      "paged data size is 1 or 0",
      [0, 1].includes(pagedResult.data.length),
      true,
    );
    if (pagedResult.data.length === 1) {
      TestValidator.equals(
        "paged entity matches data subset",
        pagedResult.data[0],
        allSettings.data[0],
      );
    }
  } else {
    // If no platform settings exist, expect empty result
    TestValidator.equals("result empty", allSettings.data.length, 0);
    // Try filtering (should remain empty)
    const filteredNoData: IPageIShoppingMallPlatformSetting.ISummary =
      await api.functional.shoppingMall.admin.platformSettings.index(
        connection,
        {
          body: {
            site_title: "nonexistent_title",
          } satisfies IShoppingMallPlatformSetting.IRequest,
        },
      );
    typia.assert(filteredNoData);
    TestValidator.equals(
      "filtered on no-data returns empty",
      filteredNoData.data.length,
      0,
    );
  }
}
