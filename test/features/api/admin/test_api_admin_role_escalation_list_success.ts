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
 * Validate listing of role escalations as an authenticated admin.
 *
 * This test covers registration of a new admin, then retrieves the list of
 * role escalation events with multiple filter and pagination scenarios.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin account
 * 2. List role escalations without any filter: verify page metadata and
 *    summary entries are present and valid.
 * 3. List role escalations with a specific from_role/to_role filter: verify
 *    all returned entries match the filter
 * 4. List role escalations with pagination: request a specific page/size and
 *    validate returned page info
 * 5. List role escalations with a non-existent filter (bogus combo): expect
 *    empty data array with valid page metadata
 */
export async function test_api_admin_role_escalation_list_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminRegBody = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminRegBody,
  });
  typia.assert(adminAuth);

  // 2. List role escalations with no filter (default)
  const resultDefault =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      { body: {} satisfies IShoppingMallAiBackendRoleEscalation.IRequest },
    );
  typia.assert(resultDefault);
  TestValidator.predicate(
    "pagination info exists on default query",
    !!resultDefault.pagination &&
      typeof resultDefault.pagination.current === "number",
  );
  TestValidator.predicate(
    "role escalation summaries (default) is array",
    Array.isArray(resultDefault.data),
  );
  TestValidator.predicate(
    "pagination reports total records >= 0",
    typeof resultDefault.pagination.records === "number" &&
      resultDefault.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination reports total pages >= 0",
    typeof resultDefault.pagination.pages === "number" &&
      resultDefault.pagination.pages >= 0,
  );

  // Further validates each summary
  for (const summary of resultDefault.data) {
    TestValidator.predicate(
      "role escalation summary has id",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "role escalation summary has user_id",
      typeof summary.user_id === "string" && summary.user_id.length > 0,
    );
    TestValidator.predicate(
      "role escalation summary has from_role",
      typeof summary.from_role === "string",
    );
    TestValidator.predicate(
      "role escalation summary has to_role",
      typeof summary.to_role === "string",
    );
    TestValidator.predicate(
      "escalation_type is present",
      typeof summary.escalation_type === "string",
    );
    TestValidator.predicate(
      "created_at is present",
      typeof summary.created_at === "string",
    );
    // Optional: Validate valid ISO format for created_at (basic check)
    TestValidator.predicate(
      "created_at looks like ISO date",
      summary.created_at.includes("T") && summary.created_at.endsWith("Z"),
    );
  }

  // 3. List with specific from_role/to_role filter (simulate likely existing roles)
  const fromRole = resultDefault.data[0]?.from_role || "customer";
  const toRole = resultDefault.data[0]?.to_role || "seller";
  const filtered =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      {
        body: {
          from_role: fromRole,
          to_role: toRole,
        } satisfies IShoppingMallAiBackendRoleEscalation.IRequest,
      },
    );
  typia.assert(filtered);
  for (const entry of filtered.data) {
    TestValidator.equals("from_role matches filter", entry.from_role, fromRole);
    TestValidator.equals("to_role matches filter", entry.to_role, toRole);
  }

  // 4. List with pagination (e.g., page:2, page_size:1)
  const paged =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      {
        body: {
          page: 2,
          page_size: 1,
        } satisfies IShoppingMallAiBackendRoleEscalation.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "paged response reports current page",
    paged.pagination.current,
    2,
  );
  TestValidator.equals(
    "paged response reports page size",
    paged.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paged results data array is array",
    Array.isArray(paged.data),
  );

  // 5. List with non-existent filter (bogus from/to/esc-type) yields empty
  const none =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
      connection,
      {
        body: {
          from_role: "__nonexistent__",
          to_role: "__nonexistent__",
          escalation_type: "__nonexistent__",
        } satisfies IShoppingMallAiBackendRoleEscalation.IRequest,
      },
    );
  typia.assert(none);
  TestValidator.equals("bogus filter yields empty data", none.data.length, 0);
}
