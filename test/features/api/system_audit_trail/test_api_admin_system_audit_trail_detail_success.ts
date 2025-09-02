import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";
import type { IPageIShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemAuditTrail";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test successful retrieval of a single system audit trail entry by
 * auditTrailId as an authenticated admin.
 *
 * This test exercises the business workflow:
 *
 * 1. Register and authenticate a new admin via POST /auth/admin/join
 * 2. Use the PATCH /shoppingMallAiBackend/admin/systemAuditTrails to search
 *    for (or discover) an audit trail id
 * 3. Invoke GET /shoppingMallAiBackend/admin/systemAuditTrails/{auditTrailId}
 *    to fetch a single audit detail
 *
 * The test confirms:
 *
 * - Admin registration and authentication are correct
 * - Audit trail listings can be obtained and have valid structure
 * - At least one audit trail exists for further query (if not, the test
 *   aborts with explicit predicate failure)
 * - The detail endpoint returns a record exactly matching the referenced id,
 *   with all required metadata fields present
 * - The detail record's core fields (event_type, actor_id, description,
 *   metadata, created_at) are present and valid
 * - The access flow is strictly limited to authorized admins (no role leakage
 *   or improper access via this scenario)
 */
export async function test_api_admin_system_audit_trail_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin for the test context
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminResult);
  // 2. Use PATCH /shoppingMallAiBackend/admin/systemAuditTrails to list/search existing audit entries the admin can see
  const auditPage =
    await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendSystemAuditTrail.IRequest,
      },
    );
  typia.assert(auditPage);
  TestValidator.predicate(
    "at least one audit trail must exist for subsequent detail lookup",
    auditPage.data.length > 0,
  );
  const auditTrailId = typia.assert(auditPage.data[0].id);
  // 3. Retrieve audit trail detail using the valid id
  const detail =
    await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.at(
      connection,
      {
        auditTrailId,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "retrieved audit trail id matches listed reference",
    detail.id,
    auditTrailId,
  );
  TestValidator.predicate(
    "event_type is a non-empty string",
    typeof detail.event_type === "string" && detail.event_type.length > 0,
  );
  TestValidator.predicate(
    "actor_id is a valid UUID (v4, 36 char, hyphenated)",
    typeof detail.actor_id === "string" &&
      /^[0-9a-fA-F\-]{36}$/.test(detail.actor_id),
  );
  TestValidator.predicate(
    "description is a non-empty string",
    typeof detail.description === "string" && detail.description.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time with T",
    typeof detail.created_at === "string" && detail.created_at.includes("T"),
  );
}
