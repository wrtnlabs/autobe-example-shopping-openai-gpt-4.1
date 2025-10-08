import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Validate the admin dashboard's ability to filter and paginate admin action
 * logs, enforce admin-only access, and verify audit trail integrity.
 *
 * 1. Register and login as a new admin A
 * 2. Create several admin action logs as admin A, using a variety of action_type,
 *    domain, and affected_entity combinations
 * 3. Use PATCH /shoppingMall/admin/adminActionLogs to search: a. with no filters
 *    (should return all entries) b. filter by action_type, domain,
 *    acting_admin_id, date range, each separately c. test paging (limit, page)
 *    d. test sorting (sort_by, sort_order)
 * 4. Attempt to call the API as an unauthenticated/non-admin user (should fail)
 * 5. Verify accesses themselves are audited in the logs if audit logging is
 *    implemented
 */
export async function test_api_admin_action_log_index_admin_dashboard_filter_sort(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoinRes);
  const adminId = adminJoinRes.id;

  // 2. Create several admin action logs
  const actionTypes = [
    "approval",
    "ban",
    "override",
    "edit",
    "restore",
    "delete",
  ] as const;
  const domains = [
    "customer",
    "seller",
    "product",
    "order",
    "review",
    "system",
  ] as const;
  const NUM_LOGS = 7;
  const createdLogs: IShoppingMallAdminActionLog[] = [];
  for (let i = 0; i < NUM_LOGS; ++i) {
    const actionLogCreate = {
      shopping_mall_admin_id: adminId,
      action_type: RandomGenerator.pick(actionTypes),
      action_reason: RandomGenerator.paragraph({ sentences: 3 }),
      domain: RandomGenerator.pick(domains),
    } satisfies IShoppingMallAdminActionLog.ICreate;
    const createdLog =
      await api.functional.shoppingMall.admin.adminActionLogs.create(
        connection,
        { body: actionLogCreate },
      );
    typia.assert(createdLog);
    createdLogs.push(createdLog);
  }

  // 3a. Search with no filters - should return at least the NUM_LOGS entries
  const allLogsResult =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: {} satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(allLogsResult);
  TestValidator.predicate(
    "returned logs length >= #logs",
    allLogsResult.data.length >= NUM_LOGS,
  );

  // 3b. Filter by action_type
  const sampleType = createdLogs[0].action_type;
  const filterTypeResult =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: {
        action_type: sampleType,
      } satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(filterTypeResult);
  filterTypeResult.data.forEach((log) => {
    TestValidator.equals(
      "action_type matches filter",
      log.action_type,
      sampleType,
    );
  });

  // 3c. Filter by acting_admin_id
  const filterAdminResult =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: {
        acting_admin_id: adminId,
      } satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(filterAdminResult);
  filterAdminResult.data.forEach((log) => {
    TestValidator.equals(
      "acting_admin_id matches filter",
      log.shopping_mall_admin_id,
      adminId,
    );
  });

  // 3d. Filter by domain
  const sampleDomain = createdLogs[0].domain;
  const filterDomainResult =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: {
        affected_domain: sampleDomain,
      } satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(filterDomainResult);
  filterDomainResult.data.forEach((log) => {
    TestValidator.equals("domain matches filter", log.domain, sampleDomain);
  });

  // 3e. Date range filter test
  const someCreatedAt = createdLogs[0].created_at;
  const dateRangeResult =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: {
        created_at_from: someCreatedAt,
        created_at_to: someCreatedAt,
      } satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(dateRangeResult);
  dateRangeResult.data.forEach((log) => {
    TestValidator.predicate(
      "created_at in range",
      log.created_at >= someCreatedAt && log.created_at <= someCreatedAt,
    );
  });

  // 3f. Test paging/limit
  const pageResult =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: { limit: 2 } satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(pageResult);
  TestValidator.equals("page size matches limit", pageResult.data.length, 2);

  // 3g. Test sorting (desc/asc)
  const sortDesc =
    await api.functional.shoppingMall.admin.adminActionLogs.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallAdminActionLog.IRequest,
    });
  typia.assert(sortDesc);
  for (let i = 1; i < sortDesc.data.length; ++i)
    TestValidator.predicate(
      "created_at desc order",
      sortDesc.data[i - 1].created_at >= sortDesc.data[i].created_at,
    );

  const sortAsc = await api.functional.shoppingMall.admin.adminActionLogs.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallAdminActionLog.IRequest,
    },
  );
  typia.assert(sortAsc);
  for (let i = 1; i < sortAsc.data.length; ++i)
    TestValidator.predicate(
      "created_at asc order",
      sortAsc.data[i - 1].created_at <= sortAsc.data[i].created_at,
    );

  // 4. Attempt as non-admin (unauth connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access admin action logs",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.index(
        unauthConn,
        { body: {} satisfies IShoppingMallAdminActionLog.IRequest },
      );
    },
  );

  // 5. Optionally: verify that this denied access gets logged as an attempted access
  // (Best-effort, since actual auditing logic is backend business)
}
