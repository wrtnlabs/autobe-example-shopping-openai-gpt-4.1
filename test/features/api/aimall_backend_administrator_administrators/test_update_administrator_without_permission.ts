import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Test: Access is denied when a non-privileged user attempts to update an
 * administrator profile.
 *
 * Business context:
 *
 * - Only users with sufficient administrative permission (super-admin, permission
 *   manager) are allowed to update administrator records in AIMall backend.
 * - General users or unauthenticated/insufficient-permission sessions must not be
 *   able to alter administrator data.
 *
 * Test steps:
 *
 * 1. Create a new administrator as the update target via the admin creation API.
 * 2. Attempt to update this administrator's properties from a context that does
 *    not have sufficient privileges.
 * 3. Confirm that the update operation is denied (should throw an error).
 * 4. (No read-back: No API for fetching admin state is listed—so skip change
 *    verification.)
 */
export async function test_api_aimall_backend_administrator_administrators_test_update_administrator_without_permission(
  connection: api.IConnection,
) {
  // 1. Create target administrator
  const targetAdmin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: "Target Admin",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(targetAdmin);

  // 2. Attempt update with insufficient permissions (default connection assumes non-privileged context; no role switching API is present)
  await TestValidator.error(
    "Access denied for updating administrator from insufficient-permission context",
  )(async () => {
    await api.functional.aimall_backend.administrator.administrators.update(
      connection,
      {
        administratorId: targetAdmin.id,
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: "Should Not Update",
          status: "suspended",
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendAdministrator.IUpdate,
      },
    );
  });
  // 3. (No database change/read-back: API for fetching admin is not available in this context)
}
