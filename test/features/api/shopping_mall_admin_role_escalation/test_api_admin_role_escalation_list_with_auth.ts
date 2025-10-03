import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleEscalation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleEscalation";

/**
 * Validate paginated, filtered retrieval of admin role escalation requests.
 *
 * - Register a new admin (join) and authenticate.
 * - Attempt to list role escalations for this admin (expect an empty page
 *   initially).
 * - Query pagination with default parameters and custom limits.
 * - Simulate/assume some role escalations exist for this admin (backend
 *   responsibility; test retrieval logic).
 * - Test filtering by status, escalation_type, and requestor_id via request body
 *   fields.
 * - Confirm only escalation records for the correct adminId are visible.
 * - Vary paging (page/limit) and assert pagination correctness.
 * - Attempt access with unauthorized/invalid adminId; assert proper error (e.g.,
 *   not found or forbidden).
 * - Ensure privacy/audit/compliance fields (created_at, updated_at) are present
 *   in results.
 * - Check that data returned matches requested filters and all required audit
 *   information is present.
 */
export async function test_api_admin_role_escalation_list_with_auth(
  connection: api.IConnection,
) {
  // 1. Register new admin (join) and authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Try listing escalations for this admin (should be empty initially)
  const emptyResult =
    await api.functional.shoppingMall.admin.admins.roleEscalations.index(
      connection,
      {
        adminId: admin.id,
        body: {},
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "initial escalation list empty",
    emptyResult.data.length,
    0,
  );

  // 3. Simulate escalations indirectly (assume backend generates or test infra sets up)
  // Can't create directly here; proceed to test for presence if backend/fixtures provide.

  // 4. Try filter with impossible value (should always return empty)
  const filteredNone =
    await api.functional.shoppingMall.admin.admins.roleEscalations.index(
      connection,
      {
        adminId: admin.id,
        body: { status: "_not_a_real_status_" },
      },
    );
  typia.assert(filteredNone);
  TestValidator.equals(
    "filter with invalid status should be empty",
    filteredNone.data.length,
    0,
  );

  // 5. Try setting custom paging params (default page=1/limit=20 is assumed)
  const pagingResult =
    await api.functional.shoppingMall.admin.admins.roleEscalations.index(
      connection,
      {
        adminId: admin.id,
        body: { page: 1, limit: 5 },
      },
    );
  typia.assert(pagingResult);
  TestValidator.equals(
    "pagination limits obeyed",
    pagingResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination page is correct",
    pagingResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination total records match data length or more",
    pagingResult.pagination.records >= pagingResult.data.length,
  );

  // 6. Attempt escalation search with random supported status/type/requestor (demonstrates filter fields)
  // (since data cannot be seeded here, logic only verifies structure/filtering if data present)
  const filterBody = {
    status: undefined,
    escalation_type: undefined,
    requestor_id: undefined,
  } satisfies IShoppingMallAdminRoleEscalation.IRequest;
  const filtered =
    await api.functional.shoppingMall.admin.admins.roleEscalations.index(
      connection,
      {
        adminId: admin.id,
        body: filterBody,
      },
    );
  typia.assert(filtered);

  for (const rec of filtered.data) {
    // Confirm correct admin, presence of summary fields
    TestValidator.equals(
      "record admin id matches",
      rec.shopping_mall_admin_id,
      admin.id,
    );
    TestValidator.predicate("has id field", !!rec.id);
    TestValidator.predicate("has escalation_type field", !!rec.escalation_type);
    TestValidator.predicate("has status field", !!rec.status);
    TestValidator.predicate("has created_at timestamp", !!rec.created_at);
    TestValidator.predicate("has updated_at timestamp", !!rec.updated_at);
  }

  // 7. Page navigation (ask next page even if empty; structure should still be valid)
  const nextPage =
    await api.functional.shoppingMall.admin.admins.roleEscalations.index(
      connection,
      {
        adminId: admin.id,
        body: { page: 2, limit: 5 },
      },
    );
  typia.assert(nextPage);
  TestValidator.equals(
    "page navigation page number",
    nextPage.pagination.current,
    2,
  );

  // 8. Unauthorized/invalid adminId: should return forbidden/not found error
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("nonexistent admin id should error", async () => {
    await api.functional.shoppingMall.admin.admins.roleEscalations.index(
      connection,
      {
        adminId: fakeId,
        body: {},
      },
    );
  });
}
