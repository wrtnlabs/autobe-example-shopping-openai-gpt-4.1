import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * Test the creation of a new RBAC permission/role with valid data as an
 * administrator.
 *
 * This test validates the backend ability to create a new RBAC permission or
 * role definition in the AIMall system via administrator authority. It covers
 * both the successful flow (with unique name/code and valid detail data) and
 * checks uniqueness constraint enforcement.
 *
 * Steps:
 *
 * 1. Submit a valid permission/role creation request as an administrator with
 *    unique `name` (code), valid `display_name`, and `description`.
 * 2. Validate that the API response contains the full, correctly populated
 *    permission object with generated ID, timestamps, and all submitted
 *    details.
 * 3. Attempt to create a permission/role again with the same `name` (code) to
 *    verify uniqueness constraint is enforced (should fail with error).
 * 4. Optionally, check that audit logging for creation is successful (acknowledged
 *    in comments, as API validation not exposed).
 */
export async function test_api_aimall_backend_administrator_permissions_test_create_new_permission_role_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new permission/role with unique data
  const baseName = `perm_${RandomGenerator.alphaNumeric(8)}`;
  const uniqueCreate = {
    name: baseName,
    display_name: `Display for ${baseName}`,
    description: `Description for ${baseName}`,
  } satisfies IAimallBackendPermission.ICreate;

  const created =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      { body: uniqueCreate },
    );
  typia.assert(created);

  // 2. Validate response content matches request and includes generated fields
  TestValidator.equals("name matches")(created.name)(uniqueCreate.name);
  TestValidator.equals("display name matches")(created.display_name)(
    uniqueCreate.display_name,
  );
  TestValidator.equals("description matches")(created.description)(
    uniqueCreate.description,
  );
  TestValidator.predicate("id is UUID")(
    typeof created.id === "string" && /^[0-9a-fA-F-]{36,36}$/.test(created.id),
  );
  TestValidator.predicate("created_at is date-time string")(
    typeof created.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T/.test(created.created_at),
  );

  // 3. Attempt to create a duplicate permission/role (should fail on unique constraint)
  TestValidator.error("duplicate name/code constraint")(() =>
    api.functional.aimall_backend.administrator.permissions.create(connection, {
      body: uniqueCreate,
    }),
  );
  // 4. (Audit logging is not directly testable via API, but event should be acknowledged in logs)
}
