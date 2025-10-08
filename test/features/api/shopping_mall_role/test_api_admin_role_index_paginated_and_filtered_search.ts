import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRole";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * E2E test the admin roles listing endpoint for pagination and filtering.
 *
 * 1. Register and authenticate as a new admin.
 * 2. Retrieve all roles with no filter, validate pagination/data.
 * 3. Filter by role_name and/or description (using substring from results),
 *    validate filtered search.
 * 4. Paginate with limit/page to check boundaries, confirm correct data and count.
 * 5. Issue search filter that returns no results; confirm list is empty, not
 *    error.
 * 6. Attempt access as unauthenticated user by removing token - confirm runtime
 *    error (no type validation).
 *
 * All results validated with typia.assert and business assertions, never
 * testing schema/type errors.
 */
export async function test_api_admin_role_index_paginated_and_filtered_search(
  connection: api.IConnection,
) {
  // 1. Register and login new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. List all roles, no filter
  const resultAll = await api.functional.shoppingMall.admin.roles.index(
    connection,
    {
      body: {} satisfies IShoppingMallRole.IRequest,
    },
  );
  typia.assert(resultAll);
  TestValidator.predicate(
    "has pagination object",
    !!resultAll.pagination && typeof resultAll.pagination.current === "number",
  );
  TestValidator.predicate("roles data is array", Array.isArray(resultAll.data));

  // 3. Filter by role_name substring
  if (resultAll.data.length > 0) {
    const firstRole = resultAll.data[0];
    const keyword = RandomGenerator.substring(firstRole.role_name);
    const filteredByName = await api.functional.shoppingMall.admin.roles.index(
      connection,
      {
        body: { role_name: keyword } satisfies IShoppingMallRole.IRequest,
      },
    );
    typia.assert(filteredByName);
    TestValidator.predicate(
      "filtered roles all include role_name substring",
      filteredByName.data.every((role) =>
        role.role_name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
  }

  // 4. Filter by description substring
  if (resultAll.data.length > 0) {
    const firstRole = resultAll.data[0];
    const keyword = RandomGenerator.substring(firstRole.description);
    const filteredByDesc = await api.functional.shoppingMall.admin.roles.index(
      connection,
      {
        body: { description: keyword } satisfies IShoppingMallRole.IRequest,
      },
    );
    typia.assert(filteredByDesc);
    TestValidator.predicate(
      "filtered roles all include description substring",
      filteredByDesc.data.every((role) =>
        role.description.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
  }

  // 5. Pagination boundary check
  const paginationResult = await api.functional.shoppingMall.admin.roles.index(
    connection,
    {
      body: { page: 1, limit: 1 } satisfies IShoppingMallRole.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit is 1",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "at most 1 item returned",
    paginationResult.data.length <= 1,
  );

  // 6. Search yielding no results
  const noResult = await api.functional.shoppingMall.admin.roles.index(
    connection,
    {
      body: {
        role_name: RandomGenerator.alphaNumeric(20),
      } satisfies IShoppingMallRole.IRequest,
    },
  );
  typia.assert(noResult);
  TestValidator.equals("empty roles result", noResult.data.length, 0);

  // 7. Unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access forbidden", async () => {
    await api.functional.shoppingMall.admin.roles.index(unauthConn, {
      body: {} satisfies IShoppingMallRole.IRequest,
    });
  });
}
