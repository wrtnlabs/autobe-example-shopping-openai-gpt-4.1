import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * Validate that retrieving the details of an RBAC permission with an invalid or
 * non-existent permissionId returns a 'not found' error as expected.
 *
 * This test ensures administrators receive proper error feedback (404 or
 * equivalent) when requesting permission details for a UUID that does not exist
 * in the aimall_backend_permissions table. It should not expose any sensitive
 * information in the error response.
 *
 * 1. Generate a random UUID that is extremely unlikely to exist as a permissionId.
 * 2. Attempt to retrieve the corresponding permission detail as an administrator
 *    using the endpoint.
 * 3. Assert that a 404 not found error (or appropriate error code) is returned.
 * 4. Confirm that no permission data or sensitive admin info is leaked in error
 *    response.
 */
export async function test_api_aimall_backend_administrator_permissions_test_get_permission_detail_with_invalid_permission_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate random UUID unlikely to be present in permissions table
  const nonExistentPermissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. Attempt to retrieve and expect error
  await TestValidator.error("404 not found for non-existent permissionId")(
    async () => {
      await api.functional.aimall_backend.administrator.permissions.at(
        connection,
        { permissionId: nonExistentPermissionId },
      );
    },
  );

  // 4. (No additional sensitive data response validation possible without error payload spec)
}
