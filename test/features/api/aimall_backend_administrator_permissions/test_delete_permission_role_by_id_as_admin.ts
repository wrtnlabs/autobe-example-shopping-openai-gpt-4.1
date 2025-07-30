import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * Validate successful hard deletion of an RBAC permission/role entity by
 * administrator.
 *
 * Business context: In the AIMall admin RBAC system, deleting a permission/role
 * is an irreversible operation with compliance implications. Deletion must
 * remove the entity completely (no soft delete). Any subsequent attempts to
 * access the permission/role by its ID must result in a 404 Not Found. The
 * deletion event must also be recorded by the audit/logging mechanism, though
 * log verification might be out of scope for direct API testing.
 *
 * Test Steps:
 *
 * 1. Create a unique permission/role using the POST
 *    /aimall-backend/administrator/permissions endpoint, collecting its ID for
 *    use in deletion.
 * 2. Delete the permission/role using DELETE
 *    /aimall-backend/administrator/permissions/:permissionId as an
 *    administrator.
 * 3. Attempt to delete the same permission/role again to confirm proper 404
 *    handling (already deleted).
 * 4. (If available) Attempt to retrieve the deleted permission/role and expect a
 *    404 Not Found.
 * 5. (Optional) Comment on audit logging, which should be handled by the backend;
 *    if log API is available, verify the deletion event was logged.
 */
export async function test_api_aimall_backend_administrator_permissions_test_delete_permission_role_by_id_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a new permission/role for testing deletion
  const createPayload: IAimallBackendPermission.ICreate = {
    name: `test_role_${RandomGenerator.alphaNumeric(8)}`,
    display_name: `Test삭제권한역할${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph()(),
  };
  const permission =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      { body: createPayload },
    );
  typia.assert(permission);

  // 2. Hard delete the newly created permission/role
  await api.functional.aimall_backend.administrator.permissions.erase(
    connection,
    { permissionId: permission.id },
  );

  // 3. Attempt to delete again, expect a 404 error
  await TestValidator.error(
    "delete of non-existent permission/role should fail",
  )(() =>
    api.functional.aimall_backend.administrator.permissions.erase(connection, {
      permissionId: permission.id,
    }),
  );

  // 4. (If readable API exists) Attempt to retrieve by ID, expect a 404
  // (No 'get' API for single permission specified, skip this step)

  // 5. (Comment on audit log: should be covered by backend-side logging mechanisms)
  // If relevant endpoint for audit exists, implement verification
}
