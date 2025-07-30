import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * Test updating display_name and description of an existing RBAC permission
 * role by an administrator.
 *
 * This test verifies the admin can successfully update the display name and
 * description fields for a permission/role defined in the AIMall backend RBAC
 * system. Uniqueness of the 'name' code must be preserved if it is modified
 * (though this test uses standard non-conflicting names). The function first
 * creates a permission using the proper dependency API, then performs a valid
 * update with new display_name/description and checks the result.
 *
 * Steps:
 *
 * 1. Create a new permission/role by calling the create endpoint with unique code
 *    (name), display_name, and description.
 * 2. Call update with the permissionId of the created role, updating display_name
 *    and description to new values. Optionally, try changing 'name' to another
 *    unique value and verify update is allowed. (Uniqueness error scenarios are
 *    handled elsewhere.)
 * 3. Validate the output reflects all submitted/updated values, and that unchanged
 *    fields retain their previous values (e.g. created_at timestamp, unchanged
 *    name).
 * 4. Optionally, fetch or otherwise check persistence if such endpoints existed
 *    (but omitted here; only validate modify call response).
 * 5. Assert correct type shape with typia and that updates are present.
 */
export async function test_api_aimall_backend_administrator_permissions_test_update_permission_role_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create an initial permission/role
  const initialPermissionInput = {
    name: `auto_role_${RandomGenerator.alphaNumeric(8)}`,
    display_name: `자동 생성 권한-${RandomGenerator.alphabets(4)}`,
    description: `테스트용 자동 생성 권한: ${RandomGenerator.paragraph()()}`,
  } satisfies IAimallBackendPermission.ICreate;
  const created =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      { body: initialPermissionInput },
    );
  typia.assert(created);
  // 2. Update display_name and description fields
  const updatedDisplayName = `업데이트된 권한명-${RandomGenerator.alphabets(4)}`;
  const updatedDescription = `설명 업데이트: ${RandomGenerator.paragraph()()}`;
  const updateInput = {
    display_name: updatedDisplayName,
    description: updatedDescription,
  } satisfies IAimallBackendPermission.IUpdate;
  const updated =
    await api.functional.aimall_backend.administrator.permissions.update(
      connection,
      {
        permissionId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  // 3. Validate all updated and unchanged fields
  TestValidator.equals("permission id should remain unchanged")(updated.id)(
    created.id,
  );
  TestValidator.equals("code (name) should remain unchanged")(updated.name)(
    created.name,
  );
  TestValidator.equals("display_name updated")(updated.display_name)(
    updatedDisplayName,
  );
  TestValidator.equals("description updated")(updated.description)(
    updatedDescription,
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    created.created_at,
  );
}
