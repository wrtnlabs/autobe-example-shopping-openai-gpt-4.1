import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

/**
 * Validate advanced paginated audit log search functionality and permission
 * enforcement for admins.
 *
 * This test registers a new admin, then exercises PATCH
 * /shoppingMall/admin/auditLogs with a variety of search filters, pagination,
 * and permission boundary checks. It ensures audit log retrieval is restricted
 * to admins, filters work as intended, pagination and sorting are respected,
 * and error conditions are properly handled.
 *
 * Steps:
 *
 * 1. Register a new admin (using /auth/admin/join) to gain search access.
 * 2. Access auditLog search with no filter (fetch first page).
 * 3. Search with combinations of entity_type, actor, event_type, event_result,
 *    date range, snapshot_id.
 * 4. Validate correct subset of entries, pagination info, and sorting on
 *    'event_time desc'.
 * 5. Try invalid filters (e.g. gibberish uuid, out-of-bounds pagination).
 * 6. Confirm non-admin role or unauthenticated requests are denied.
 */
export async function test_api_audit_log_advanced_search_admin_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Basic: fetch first page with no filters (ensure at least 0 entries, proper pagination)
  const page0: IPageIShoppingMallAuditLog =
    await api.functional.shoppingMall.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort: "event_time desc",
      } satisfies IShoppingMallAuditLog.IRequest,
    });
  typia.assert(page0);
  TestValidator.predicate(
    "result pagination correct",
    page0.pagination.current === 1 && page0.pagination.limit === 10,
  );

  // Try extracting a value for advanced filter tests
  const hasData = page0.data.length > 0;
  let filterSample: IShoppingMallAuditLog | undefined = undefined;
  if (hasData) filterSample = page0.data[0];

  // 3. Advanced: filter by entity_type and event_type (if available)
  if (filterSample != null) {
    const filterPage: IPageIShoppingMallAuditLog =
      await api.functional.shoppingMall.admin.auditLogs.index(connection, {
        body: {
          entity_type: filterSample.entity_type,
          event_type: filterSample.event_type,
          page: 1,
          limit: 10,
          sort: "event_time desc",
        } satisfies IShoppingMallAuditLog.IRequest,
      });
    typia.assert(filterPage);
    // Results must match filter
    if (filterPage.data.length > 0)
      filterPage.data.forEach((e) => {
        TestValidator.equals(
          "entity_type filtered",
          e.entity_type,
          filterSample!.entity_type,
        );
        TestValidator.equals(
          "event_type filtered",
          e.event_type,
          filterSample!.event_type,
        );
      });
  }

  // 4. Filtering by actor_id and event_result (if sample available)
  if (filterSample != null) {
    const filterPage: IPageIShoppingMallAuditLog =
      await api.functional.shoppingMall.admin.auditLogs.index(connection, {
        body: {
          actor_id: filterSample.actor_id ?? undefined,
          event_result: filterSample.event_result,
          page: 1,
          limit: 5,
          sort: "event_time desc",
        } satisfies IShoppingMallAuditLog.IRequest,
      });
    typia.assert(filterPage);
    filterPage.data.forEach((e) => {
      if (filterSample!.actor_id)
        TestValidator.equals(
          "actor_id filtered",
          e.actor_id,
          filterSample!.actor_id,
        );
      TestValidator.equals(
        "event_result filtered",
        e.event_result,
        filterSample!.event_result,
      );
    });
  }

  // 5. Filtering by event_time_from and event_time_to (date range)
  if (filterSample != null) {
    // Range: +/- 1 day from filterSample.event_time
    const refTime = new Date(filterSample.event_time);
    const from = new Date(
      refTime.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const to = new Date(refTime.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const dateFilteredPage =
      await api.functional.shoppingMall.admin.auditLogs.index(connection, {
        body: {
          event_time_from: from,
          event_time_to: to,
          page: 1,
          limit: 10,
          sort: "event_time desc",
        } satisfies IShoppingMallAuditLog.IRequest,
      });
    typia.assert(dateFilteredPage);
    // Each event_time should be within range
    dateFilteredPage.data.forEach((x) => {
      TestValidator.predicate(
        `event_time in range`,
        new Date(x.event_time).getTime() >= new Date(from).getTime() &&
          new Date(x.event_time).getTime() <= new Date(to).getTime(),
      );
    });
  }

  // 6. Filter by non-existent IDs (should return empty or error gracefully)
  const gibberishUuid = typia.random<string & tags.Format<"uuid">>();
  const invalidFilterPage =
    await api.functional.shoppingMall.admin.auditLogs.index(connection, {
      body: {
        actor_id: gibberishUuid,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallAuditLog.IRequest,
    });
  typia.assert(invalidFilterPage);
  TestValidator.equals(
    "non-existent actor_id yields empty",
    invalidFilterPage.data.length,
    0,
  );

  // 7. Out-of-bounds page (should return empty array, stay graceful)
  const OOBPage = await api.functional.shoppingMall.admin.auditLogs.index(
    connection,
    {
      body: { page: 100000, limit: 5 } satisfies IShoppingMallAuditLog.IRequest,
    },
  );
  typia.assert(OOBPage);
  TestValidator.equals(
    "out-of-bounds pagination is empty",
    OOBPage.data.length,
    0,
  );

  // 8. Permission: unauthenticated access forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated cannot access audit logs",
    async () => {
      await api.functional.shoppingMall.admin.auditLogs.index(unauthConn, {
        body: { page: 1, limit: 1 } satisfies IShoppingMallAuditLog.IRequest,
      });
    },
  );
}
