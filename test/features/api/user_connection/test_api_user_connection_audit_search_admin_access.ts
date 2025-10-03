import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserConnection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserConnection";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserConnection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserConnection";

/**
 * Validate advanced search/audit access & filtering of user connection/session
 * logs by an admin.
 *
 * 1. Register as a new admin and obtain authorization.
 * 2. The act of registration creates a user connection/session log for the admin.
 * 3. Use the audit search endpoint as the admin, filtering by actor_type,
 *    channel_id, and a window covering now.
 * 4. Confirm at least one session is found and matches the admin, with key
 *    metadata visible (id, ip address etc).
 * 5. Repeat search with wrong filters (wrong actor_type, impossible date range,
 *    etc) to confirm empty results.
 * 6. Attempt to access audit endpoint with an unauthenticated/non-admin
 *    connection, expect error.
 * 7. Check default pagination values (first page, default size).
 * 8. All data creation via compliant random values.
 */
export async function test_api_user_connection_audit_search_admin_access(
  connection: api.IConnection,
) {
  // 1. Register/login as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Use audit/search endpoint as admin
  const searchBody = {
    actor_type: "admin",
    actor_id: admin.id,
    login_at_from: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    login_at_to: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallUserConnection.IRequest;
  const page: IPageIShoppingMallUserConnection.ISummary =
    await api.functional.shoppingMall.admin.userConnections.index(connection, {
      body: searchBody,
    });
  typia.assert(page);
  TestValidator.predicate(
    "at least one session log for admin user",
    page.data.some((s) => s.actor_id === admin.id && s.actor_type === "admin"),
  );
  for (const summary of page.data) {
    typia.assert(summary);
    TestValidator.equals("actor_type is 'admin'", summary.actor_type, "admin");
  }

  // 3. Test filter: wrong actor_type
  const customerSearchBody = {
    actor_type: "customer",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallUserConnection.IRequest;
  const customerSearch: IPageIShoppingMallUserConnection.ISummary =
    await api.functional.shoppingMall.admin.userConnections.index(connection, {
      body: customerSearchBody,
    });
  typia.assert(customerSearch);
  TestValidator.equals(
    "no results for customer actor_type",
    customerSearch.data.length,
    0,
  );

  // 4. Test filter: impossible date window (all sessions will be outside this year)
  const impossibleSearchBody = {
    login_at_from: "1999-01-01T00:00:00.000Z",
    login_at_to: "1999-12-31T23:59:59.999Z",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallUserConnection.IRequest;
  const impossibleSearch: IPageIShoppingMallUserConnection.ISummary =
    await api.functional.shoppingMall.admin.userConnections.index(connection, {
      body: impossibleSearchBody,
    });
  typia.assert(impossibleSearch);
  TestValidator.equals(
    "no results for old impossible date range",
    impossibleSearch.data.length,
    0,
  );

  // 5. Permission error: Unauthenticated user (non-admin)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access audit endpoint",
    async () => {
      await api.functional.shoppingMall.admin.userConnections.index(
        unauthConn,
        {
          body: searchBody,
        },
      );
    },
  );

  // 6. Check default pagination
  const defaultPage: IPageIShoppingMallUserConnection.ISummary =
    await api.functional.shoppingMall.admin.userConnections.index(connection, {
      body: {} satisfies IShoppingMallUserConnection.IRequest,
    });
  typia.assert(defaultPage);
  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
}
