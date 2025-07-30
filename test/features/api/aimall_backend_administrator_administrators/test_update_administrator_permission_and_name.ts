import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate updating an administrator's permission and display name fields.
 *
 * This test ensures that an authorized administrator can update the permission
 * role (permission_id) and the display name (name) of another administrator
 * account. It also verifies that the returned administrator record accurately
 * reflects the changes in these fields (id, permission_id, name), and by
 * implication, compliance audit logging would be triggered by such an update
 * (not directly observable in response).
 *
 * Test Steps:
 *
 * 1. Create (POST) a new administrator to act as the update target.
 * 2. Issue a PUT request to update that administrator's permission_id and name.
 * 3. Validate that the returned resource has correct values for id, permission_id,
 *    name, and unchanged values for email/status.
 * 4. Negative case: Attempt to update a non-existent administrator and confirm
 *    error result.
 */
export async function test_api_aimall_backend_administrator_administrators_test_update_administrator_permission_and_name(
  connection: api.IConnection,
) {
  // 1. Create a new administrator
  const initialPermissionId = typia.random<string & tags.Format<"uuid">>();
  const initialEmail = typia.random<string>();
  const initialName = "AdminOriginal";

  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: initialPermissionId,
          email: initialEmail,
          name: initialName,
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Update permission_id and name
  const newPermissionId = typia.random<string & tags.Format<"uuid">>();
  const newName = "AdminUpdated";
  const updateInput = {
    permission_id: newPermissionId,
    email: admin.email, // unchanged
    name: newName,
    status: admin.status, // unchanged
    updated_at: new Date().toISOString(),
  } satisfies IAimallBackendAdministrator.IUpdate;

  const updatedAdmin =
    await api.functional.aimall_backend.administrator.administrators.update(
      connection,
      {
        administratorId: admin.id,
        body: updateInput,
      },
    );
  typia.assert(updatedAdmin);
  // 3. Validate changes
  TestValidator.equals("admin id matches")(updatedAdmin.id)(admin.id);
  TestValidator.equals("permission_id updated")(updatedAdmin.permission_id)(
    newPermissionId,
  );
  TestValidator.equals("name updated")(updatedAdmin.name)(newName);
  TestValidator.equals("email unchanged")(updatedAdmin.email)(admin.email);
  TestValidator.equals("status unchanged")(updatedAdmin.status)(admin.status);

  // 4. Negative: attempt to update a non-existent administrator
  await TestValidator.error("should fail for non-existent administrator")(
    async () => {
      await api.functional.aimall_backend.administrator.administrators.update(
        connection,
        {
          administratorId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );
}
