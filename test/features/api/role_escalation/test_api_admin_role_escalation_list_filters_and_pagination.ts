import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendRoleEscalation";
import type { IPageIShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendRoleEscalation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates filtering and pagination logic of the admin role escalation
 * list API (/shoppingMallAiBackend/admin/roleEscalations).
 *
 * - Registers and authenticates an admin using /auth/admin/join.
 * - Sends multiple requests to /shoppingMallAiBackend/admin/roleEscalations
 *   with different filter and pagination combinations, including:
 *
 *   - Filtering by from_role, to_role, escalation_type, admin_id, user_id,
 *       created_from, created_to.
 *   - Pagination controls (page, page_size), edge-cases (out of range pages).
 * - Verifies that each response includes only escalations matching the
 *   filters and that pagination metadata (current page, limit, records,
 *   pages) is correct.
 * - Tests for:
 *
 *   - Multi-criteria filtering
 *   - No-match (empty) results
 *   - Large datasets and multi-page results (if present)
 *   - Sorting behavior (if applicable via sort field)
 *   - Robustness against incorrect but valid boundary inputs.
 * - Ensures business logic for search, auditability, and admin oversight is
 *   upheld.
 */
export async function test_api_admin_role_escalation_list_filters_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register & authenticate admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.admin.id;

  // Step 2: Query without filters (all escalations, first page)
  const allPage =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      { body: { page: 1, page_size: 10 } },
    );
  typia.assert(allPage);
  TestValidator.predicate(
    "all escalations: no error on basic paging",
    Array.isArray(allPage.data),
  );
  TestValidator.equals("pagination page 1", allPage.pagination.current, 1);
  TestValidator.equals("pagination page size", allPage.pagination.limit, 10);

  if (allPage.data.length > 0) {
    // Step 3: Query by from_role filter
    const firstEsc = allPage.data[0];
    const fromRole = firstEsc.from_role;
    const fromRolePage =
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        connection,
        { body: { from_role: fromRole, page: 1, page_size: 10 } },
      );
    typia.assert(fromRolePage);
    for (const e of fromRolePage.data)
      TestValidator.equals(
        `from_role filtered: all should have from_role=${fromRole}`,
        e.from_role,
        fromRole,
      );

    // Step 4: Query by to_role + escalation_type
    const toRole = firstEsc.to_role;
    const escalationType = firstEsc.escalation_type;
    const comboPage =
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        connection,
        {
          body: {
            to_role: toRole,
            escalation_type: escalationType,
            page: 1,
            page_size: 10,
          },
        },
      );
    typia.assert(comboPage);
    for (const e of comboPage.data) {
      TestValidator.equals(
        `combo filter: all should have to_role=${toRole}`,
        e.to_role,
        toRole,
      );
      TestValidator.equals(
        `combo filter: all should have escalation_type=${escalationType}`,
        e.escalation_type,
        escalationType,
      );
    }

    // Step 5: Query by admin_id and user_id
    const userId = firstEsc.user_id;
    const idPage =
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        connection,
        { body: { admin_id: adminId, user_id: userId, page: 1, page_size: 5 } },
      );
    typia.assert(idPage);
    for (const e of idPage.data) {
      TestValidator.equals(
        `filter: all should have admin_id=${adminId}`,
        e.admin_id,
        adminId,
      );
      TestValidator.equals(
        `filter: all should have user_id=${userId}`,
        e.user_id,
        userId,
      );
    }

    // Step 6: Query by created_from/created_to dates (use existing entry)
    const firstDate = firstEsc.created_at;
    const datePage =
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        connection,
        {
          body: {
            created_from: firstDate,
            created_to: firstDate,
            page: 1,
            page_size: 10,
          },
        },
      );
    typia.assert(datePage);
    for (const e of datePage.data) {
      TestValidator.equals(
        `date filter: within filter range`,
        e.created_at,
        firstDate,
      );
    }
  }

  // Step 7: Query with filters that return no matches
  const emptyPage =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      { body: { to_role: "__impossible__", page: 1, page_size: 10 } },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no-match result returns empty array",
    emptyPage.data.length,
    0,
  );

  // Step 8: Query with out-of-range page (simulate empty)
  const farPage =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      { body: { page: 999, page_size: 10 } },
    );
  typia.assert(farPage);
  TestValidator.equals(
    "out of range page returns empty result",
    farPage.data.length,
    0,
  );

  // Step 9: Query with sort param (if supported)
  // If sort supported (the request type has 'sort'), check ascending and descending orders
  if (allPage.data.length > 1) {
    const sortAscPage =
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        connection,
        { body: { sort: "+created_at", page: 1, page_size: 10 } },
      );
    typia.assert(sortAscPage);
    // The data should be sorted by created_at ascending
    const asc = sortAscPage.data.map((e) => e.created_at);
    const sortedAsc = [...asc].sort();
    TestValidator.equals("sorted ascending by created_at", asc, sortedAsc);

    const sortDescPage =
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        connection,
        { body: { sort: "-created_at", page: 1, page_size: 10 } },
      );
    typia.assert(sortDescPage);
    const desc = sortDescPage.data.map((e) => e.created_at);
    const sortedDesc = [...desc].sort().reverse();
    TestValidator.equals("sorted descending by created_at", desc, sortedDesc);
  }
}
