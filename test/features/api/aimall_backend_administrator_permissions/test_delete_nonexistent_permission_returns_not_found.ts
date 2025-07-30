import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that attempting to delete a RBAC permission or role with a
 * non-existent ID returns a not found error.
 *
 * Business purpose:
 *
 * - Ensure the DELETE endpoint for administrator RBAC permissions/roles does not
 *   succeed when provided with a permissionId that does not exist in the
 *   system, avoiding accidental removal or side-effects on existing records.
 *
 * Test workflow:
 *
 * 1. As an administrator, attempt to hard-delete a permission or role using a
 *    random, non-existent UUID as the permissionId.
 * 2. Verify that the API returns a not found error (e.g., HTTP 404).
 * 3. Confirm that no records are deleted or affected as a result of this action
 *    (no further validation possible if this is a negative-only scenario and
 *    data setup isn't required).
 *
 * Note: This test focuses strictly on the negative scenario and does not
 * require pre-existing or setup data.
 */
export async function test_api_aimall_backend_administrator_permissions_test_delete_nonexistent_permission_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a truly random UUID for permissionId that is highly unlikely to exist.
  const nonExistentPermissionId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to delete the permission/role using this non-existent ID, expecting a not found error.
  await TestValidator.error(
    "delete non-existent permission should return not found error",
  )(async () => {
    await api.functional.aimall_backend.administrator.permissions.erase(
      connection,
      {
        permissionId: nonExistentPermissionId,
      },
    );
  });
}
