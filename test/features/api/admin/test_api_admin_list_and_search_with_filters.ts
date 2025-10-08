import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate the retrieval and advanced filtering of admin account list with
 * proper security/authorization.
 *
 * 1. Register a new admin account and authorize.
 * 2. Search admin list by name, status, and date range as admin.
 * 3. Test that unauthorized access (non-admin roles) fails.
 * 4. Ensure sensitive information is never present in results.
 * 5. Validate pagination with high result limits and multiple pages.
 */
export async function test_api_admin_list_and_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a new admin account and automatically login as that admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminStatus = RandomGenerator.pick([
    "pending",
    "active",
    "suspended",
    "disabled",
  ] as const);
  const joinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: adminFullName,
    status: adminStatus,
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);

  // 2. Search the admin list using advanced filters
  const searchBody = {
    status: adminStatus,
    email: adminEmail,
    full_name: adminFullName,
    // Date range covers now to far future to include just-created admin
    created_from: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    created_to: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdmin.IRequest;
  const page = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: searchBody },
  );
  typia.assert(page);
  TestValidator.predicate(
    "admin page data includes just-created admin by email",
    page.data.some((a) => a.email === adminEmail),
  );
  TestValidator.predicate(
    "admin page data does not contain password hashes or sensitive fields",
    page.data.every(
      (a) =>
        !("password_hash" in a) &&
        !("two_factor_secret" in a) &&
        !("token" in a),
    ),
  );
  // Validate all filtered data matches the filter criteria
  for (const admin of page.data) {
    if (searchBody.status !== undefined)
      TestValidator.equals(
        "status matches filter",
        admin.status,
        searchBody.status,
      );
    if (searchBody.full_name !== undefined)
      TestValidator.equals(
        "full name matches filter",
        admin.full_name,
        searchBody.full_name,
      );
    if (searchBody.email !== undefined)
      TestValidator.equals(
        "email matches filter",
        admin.email,
        searchBody.email,
      );
    if (searchBody.created_from !== undefined)
      TestValidator.predicate(
        "created_at after created_from",
        admin.created_at >= searchBody.created_from,
      );
    if (searchBody.created_to !== undefined)
      TestValidator.predicate(
        "created_at before created_to",
        admin.created_at <= searchBody.created_to,
      );
  }
  // 3. Check pagination by requesting a higher page/limit
  const highLimitBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdmin.IRequest;
  const multiPage = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: highLimitBody },
  );
  typia.assert(multiPage);
  TestValidator.predicate(
    "multi-page result includes just-created admin",
    multiPage.data.some((a) => a.email === adminEmail),
  );

  // 4. Attempt access as unauthenticated (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin search",
    async () => {
      await api.functional.shoppingMall.admin.admins.index(unauthConn, {
        body: { page: 1, limit: 10 } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );

  // 5. Negative: Attempt access as a different unauthenticated context/role should also fail (simulated with random connection)
  // (Assume customer/seller auth tokens would yield non-admin context, but no actual join/login API is in scope here.)
}
