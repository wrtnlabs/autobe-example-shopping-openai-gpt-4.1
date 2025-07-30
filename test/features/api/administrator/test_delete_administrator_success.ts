import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Test the successful hard deletion of an administrator account by UUID as a
 * super-admin or permission manager.
 *
 * Business Context: In AIMall's backend RBAC system, only super-admins or users
 * with admin-management roles can hard delete (irreversible delete) an
 * administrator account. This should physically remove the database row (not
 * just flag it's deleted) and be recorded in audit logs. The process needs to
 * ensure no role or permission records are orphaned and relevant integrity is
 * preserved.
 *
 * Step-by-step process:
 *
 * 1. Create a test administrator account (precondition) with a specific permission
 *    role.
 * 2. Hard delete the account by UUID using the DELETE endpoint as a privileged
 *    user.
 * 3. Attempt to fetch or operate on the deleted administrator, confirming it is no
 *    longer available (row removed).
 * 4. (Out of scope: There is no endpoint to natively check audit logs or orphaned
 *    roles/permissions in public API, so mention this verification is
 *    manual/external.)
 */
export async function test_api_administrator_test_delete_administrator_success(
  connection: api.IConnection,
) {
  // 1. Create test administrator (precondition)
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: `e2e_${typia.random<string>()}@test.local`,
          name: `E2E Test Admin ${typia.random<string>()}`,
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Hard delete the administrator by its UUID
  await api.functional.aimall_backend.administrator.administrators.erase(
    connection,
    {
      administratorId: admin.id,
    },
  );

  // 3. Try re-deleting/operating again (should fail: 404 or error)
  await TestValidator.error("should not find after hard delete")(() =>
    api.functional.aimall_backend.administrator.administrators.erase(
      connection,
      {
        administratorId: admin.id,
      },
    ),
  );

  // 4. (Manual: Check audit log/orphaned data in system.)
}
