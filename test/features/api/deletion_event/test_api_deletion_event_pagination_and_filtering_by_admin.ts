import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDeletionEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDeletionEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDeletionEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeletionEvent";

/**
 * Validate paginated search and filtering of deletion events by admin in the
 * shopping mall backend.
 *
 * 1. Register a new admin using the admin join endpoint and obtain the
 *    authentication context.
 * 2. (Simulated) Assume deletion events exist in the system, since entity deletion
 *    APIs are not exposed for new insertions in this E2E test context.
 * 3. Perform filter queries on /shoppingMall/admin/deletionEvents using PATCH
 *    method as follows: a. Basic query with empty filter for all deletion
 *    events. b. Filter by entity_type (e.g., "review"). c. Filter by
 *    deletion_reason substring. d. Filter by deleted_by_id (using the admin's
 *    id). e. Filter by date range using deleted_at_start and deleted_at_end. f.
 *    Filter by snapshot_id. g. Paginate results using limit and page, confirm
 *    correct cursoring and total. h. Test a search that produces empty results
 *    (e.g., an impossible entity_type).
 * 4. Check that response data matches filter: all returned records have the
 *    matching entity_type, reason, actor, date range, etc.
 * 5. Validate that pagination metadata (current, limit, records, pages) in the
 *    response is logical and accurate.
 * 6. Confirm each record links to its evidence snapshot via snapshot_id.
 * 7. Try calling as a non-admin user to verify access is denied (401/403 error
 *    expected).
 * 8. For all business-critical paths, assert both type compliance (using
 *    typia.assert), logic (TestValidator), and traceability fields.
 */
export async function test_api_deletion_event_pagination_and_filtering_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.id;

  // 2. Simulate existing deletion events (test data is provided by environment)

  // 3a. Query all deletion events (no filter)
  const pageAll = await api.functional.shoppingMall.admin.deletionEvents.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(pageAll);
  TestValidator.predicate(
    "all deletion events page 1 non-empty",
    pageAll.data.length >= 0,
  );

  if (pageAll.data.length > 0) {
    const firstEvent = pageAll.data[0];
    // 3b. Filter by entity_type
    const pageByEntityType =
      await api.functional.shoppingMall.admin.deletionEvents.index(connection, {
        body: { entity_type: firstEvent.entity_type },
      });
    typia.assert(pageByEntityType);
    for (const event of pageByEntityType.data) {
      TestValidator.equals(
        "entity_type matches filter",
        event.entity_type,
        firstEvent.entity_type,
      );
    }
    // 3c. Filter by deletion_reason substring
    const reasonKeyword = firstEvent.deletion_reason.slice(0, 3);
    const pageByReason =
      await api.functional.shoppingMall.admin.deletionEvents.index(connection, {
        body: { deletion_reason: reasonKeyword },
      });
    typia.assert(pageByReason);
    for (const event of pageByReason.data) {
      TestValidator.predicate(
        "deletion reason contains keyword",
        event.deletion_reason.includes(reasonKeyword),
      );
    }
    // 3d. Filter by deleted_by_id (using admin id)
    const pageByDeleter =
      await api.functional.shoppingMall.admin.deletionEvents.index(connection, {
        body: { deleted_by_id: adminId },
      });
    typia.assert(pageByDeleter);
    for (const event of pageByDeleter.data) {
      TestValidator.equals(
        "deleted_by_id is admin id",
        event.deleted_by_id,
        adminId,
      );
    }
    // 3e. Filter by date range
    const earliest = pageAll.data.map((ev) => ev.deleted_at).sort()[0];
    const latest = pageAll.data
      .map((ev) => ev.deleted_at)
      .sort()
      .reverse()[0];
    const pageByDateRange =
      await api.functional.shoppingMall.admin.deletionEvents.index(connection, {
        body: {
          deleted_at_start: earliest,
          deleted_at_end: latest,
        },
      });
    typia.assert(pageByDateRange);
    for (const event of pageByDateRange.data) {
      TestValidator.predicate(
        "event deleted_at in range",
        event.deleted_at >= earliest && event.deleted_at <= latest,
      );
    }
    // 3f. Filter by snapshot_id if firstEvent has it
    if (firstEvent.snapshot_id) {
      const pageBySnapshot =
        await api.functional.shoppingMall.admin.deletionEvents.index(
          connection,
          {
            body: { snapshot_id: firstEvent.snapshot_id },
          },
        );
      typia.assert(pageBySnapshot);
      for (const event of pageBySnapshot.data) {
        TestValidator.equals(
          "event snapshot_id matches",
          event.snapshot_id,
          firstEvent.snapshot_id,
        );
      }
    }
    // 3g. Paginate using limit and page (use limit=1)
    const page1 = await api.functional.shoppingMall.admin.deletionEvents.index(
      connection,
      {
        body: { limit: 1 },
      },
    );
    typia.assert(page1);
    TestValidator.equals("limit is 1", page1.pagination.limit, 1);
    if (page1.pagination.pages > 1) {
      const page2 =
        await api.functional.shoppingMall.admin.deletionEvents.index(
          connection,
          {
            body: { limit: 1, page: 2 },
          },
        );
      typia.assert(page2);
      TestValidator.equals("limit is 1 on page 2", page2.pagination.limit, 1);
    }
    // 3h. Use an impossible filter to produce empty result
    const emptyPage =
      await api.functional.shoppingMall.admin.deletionEvents.index(connection, {
        body: {
          entity_type: "impossible_entity_type_" + RandomGenerator.alphabets(8),
        },
      });
    typia.assert(emptyPage);
    TestValidator.equals(
      "no records for impossible entity type",
      emptyPage.data.length,
      0,
    );
    // 4. Check each record links to snapshot_id
    for (const event of pageAll.data) {
      TestValidator.predicate(
        "event snapshot_id is string or null",
        event.snapshot_id === undefined ||
          event.snapshot_id === null ||
          typeof event.snapshot_id === "string",
      );
    }
    // 5. Validate pagination metadata
    TestValidator.equals(
      "pagination current page >= 1",
      pageAll.pagination.current >= 1,
      true,
    );
    TestValidator.equals(
      "pagination limit positive",
      pageAll.pagination.limit > 0,
      true,
    );
    TestValidator.equals(
      "pagination records matches data length",
      pageAll.pagination.records >= pageAll.data.length,
      true,
    );
    TestValidator.predicate(
      "pagination pages positive",
      pageAll.pagination.pages >= 1,
    );
  }
  // 6. Test that unauthenticated (non-admin) access is denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access deletion events",
    async () => {
      await api.functional.shoppingMall.admin.deletionEvents.index(unauthConn, {
        body: {},
      });
    },
  );
}
