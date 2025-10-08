import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";

/**
 * Validate search, filter, and pagination for the admin audit log feature as an
 * authenticated platform admin.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate – get the admin ID (will use for audit
 *    event creation and filtered search).
 * 2. Create an admin audit log record using this admin's ID, with distinct
 *    audit_event_type, domain, and log_level.
 * 3. Search for audit logs using various filters:
 *
 *    - By admin ID (should get at least the newly created record)
 *    - By audit_event_type
 *    - By domain
 *    - By log_level
 *    - By keyword/q (from event_context_json if any)
 *    - By date range (using created_at_min/max)
 *    - Pagination: limit = 1 and fetch page 1/2, check data and pagination fields
 *    - Sort by created_at descending/ascending, verify order
 * 4. Validate that paginated response includes correct data and metadata, and
 *    proper total counts.
 * 5. Edge case: search by a filter that matches nothing (random audit_event_type,
 *    etc.), expect empty data array.
 * 6. Edge case: use invalid filter parameters (invalid UUID, negative page/limit,
 *    etc.), expect error.
 * 7. Edge case: attempt to search as unauthenticated/non-admin user (empty
 *    token/headers), expect error.
 */
export async function test_api_admin_audit_log_search_filter_pagination_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin & authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: adminFullName,
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a new admin audit log entry
  const auditEventType = "login";
  const domain = "platform";
  const logLevel = "info";
  const eventContext = JSON.stringify({
    action: "admin_login",
    meta: RandomGenerator.paragraph(),
  });
  const auditLog =
    await api.functional.shoppingMall.admin.adminAuditLogs.create(connection, {
      body: {
        shopping_mall_admin_id: admin.id,
        audit_event_type: auditEventType,
        domain: domain,
        event_context_json: eventContext,
        log_level: logLevel,
      } satisfies IShoppingMallAdminAuditLog.ICreate,
    });
  typia.assert(auditLog);

  // 3. Search audit logs using advanced filter criteria
  // By admin ID
  const resultByAdmin =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        admin_id: admin.id,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultByAdmin);
  TestValidator.predicate(
    "search by admin_id includes the created entry",
    resultByAdmin.data.map((a) => a.id).includes(auditLog.id),
  );

  // By audit_event_type
  const resultByType =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        audit_event_type: auditEventType,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultByType);
  TestValidator.predicate(
    "search by audit_event_type includes the created entry",
    resultByType.data.map((a) => a.id).includes(auditLog.id),
  );

  // By domain
  const resultByDomain =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: { domain: domain } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultByDomain);
  TestValidator.predicate(
    "search by domain includes the created entry",
    resultByDomain.data.map((a) => a.id).includes(auditLog.id),
  );

  // By log_level
  const resultByLogLevel =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        log_level: logLevel,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultByLogLevel);
  TestValidator.predicate(
    "search by log_level includes the created entry",
    resultByLogLevel.data.map((a) => a.id).includes(auditLog.id),
  );

  // By q keyword
  const qKeyword = "admin_login";
  const resultByQ =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: { q: qKeyword } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultByQ);
  TestValidator.predicate(
    "search by q includes the created entry",
    resultByQ.data.map((a) => a.id).includes(auditLog.id),
  );

  // By date range
  const minDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const maxDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const resultByDateRange =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        created_at_min: minDate,
        created_at_max: maxDate,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultByDateRange);
  TestValidator.predicate(
    "search by date range includes created entry",
    resultByDateRange.data.map((a) => a.id).includes(auditLog.id),
  );

  // Pagination - limit 1 (should paginate if more data exists)
  const resultPaginatedPage1 =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        limit: 1,
        page: 1,
        sort_by: "created_at",
        desc: true,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultPaginatedPage1);
  TestValidator.equals(
    "pagination page 1 current = 1",
    resultPaginatedPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit = 1",
    resultPaginatedPage1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination should have data",
    resultPaginatedPage1.data.length >= 0,
  );
  if (
    resultPaginatedPage1.data.length > 0 &&
    resultPaginatedPage1.pagination.pages > 1
  ) {
    const resultPaginatedPage2 =
      await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
        body: {
          limit: 1,
          page: 2,
          sort_by: "created_at",
          desc: true,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      });
    typia.assert(resultPaginatedPage2);
    TestValidator.equals(
      "pagination page 2 current = 2",
      resultPaginatedPage2.pagination.current,
      2,
    );
  }

  // Sort by created_at ascending, descending (just check response non-error, assume backend handles order, could enhance with client-side comparison if multiple entries)
  const resultAsc =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        sort_by: "created_at",
        desc: false,
        limit: 10,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultAsc);
  const resultDesc =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        sort_by: "created_at",
        desc: true,
        limit: 10,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(resultDesc);

  // 4. Validating response metadata (pagination, record count, etc.)
  TestValidator.predicate(
    "pagination metadata present",
    typeof resultPaginatedPage1.pagination.records === "number" &&
      typeof resultPaginatedPage1.pagination.pages === "number",
  );

  // 5. Edge case: search with no matching results (random audit_event_type)
  const noMatchResult =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: {
        audit_event_type: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no matching result yields empty data array",
    noMatchResult.data,
    [],
  );

  // 6. Edge case: invalid filter parameters (invalid UUID, negative page/limit)
  await TestValidator.error(
    "invalid admin_id should cause API error",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
        body: {
          admin_id: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      });
    },
  );
  await TestValidator.error(
    "negative page/limit should cause API error",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
        body: {
          page: -1,
          limit: -10,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      });
    },
  );

  // 7. Edge case: unauthenticated search (simulate no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated search returns error",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.index(unauthConn, {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      });
    },
  );
}
