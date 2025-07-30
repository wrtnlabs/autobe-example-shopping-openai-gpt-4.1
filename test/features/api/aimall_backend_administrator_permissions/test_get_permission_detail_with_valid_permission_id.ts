import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * Validate retrieval of detailed RBAC role/permission info by permissionId for
 * administrator
 *
 * This test ensures an admin can request the full detail of a single
 * permission/role from the RBAC system by supplying a valid permissionId
 * (UUID). It covers both positive retrieval and error handling (not found,
 * permission denied).
 *
 * Step-by-step process:
 *
 * 1. Create a new permission/role definition with unique name, display_name, and
 *    description via the admin endpoint
 * 2. Use the returned id (UUID) to fetch detail via GET
 *    /aimall-backend/administrator/permissions/{permissionId}
 * 3. Assert the fetched object matches all key schema fields (id, name,
 *    display_name, description, created_at)
 * 4. Negative: Try querying with a random invalid UUID to verify 'not found' error
 * 5. (If permissions infra exists) Validate permission-denied error if request
 *    made with insufficient privileges or unauthenticated (not implemented if
 *    no such API)
 */
export async function test_api_aimall_backend_administrator_permissions_test_get_permission_detail_with_valid_permission_id(
  connection: api.IConnection,
) {
  // 1. Create a new permission/role definition as setup
  const createInput: IAimallBackendPermission.ICreate = {
    name: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(2),
  };
  const created: IAimallBackendPermission =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 2. Retrieve the permission/role detail by its unique ID
  const fetched: IAimallBackendPermission =
    await api.functional.aimall_backend.administrator.permissions.at(
      connection,
      { permissionId: created.id },
    );
  typia.assert(fetched);

  // 3. Validate all key schema fields are present and correct
  TestValidator.equals("id matches")(fetched.id)(created.id);
  TestValidator.equals("name matches")(fetched.name)(createInput.name);
  TestValidator.equals("display_name matches")(fetched.display_name)(
    createInput.display_name,
  );
  TestValidator.equals("description matches")(fetched.description)(
    createInput.description,
  );
  TestValidator.predicate("created_at exists")(
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );

  // 4. Negative scenario: Query non-existent random UUID
  await TestValidator.error("not found triggers error")(async () => {
    await api.functional.aimall_backend.administrator.permissions.at(
      connection,
      { permissionId: typia.random<string & tags.Format<"uuid">>() },
    );
  });

  // 5. Permission-denied negative case omitted (no authentication/authorization API provided)
}
