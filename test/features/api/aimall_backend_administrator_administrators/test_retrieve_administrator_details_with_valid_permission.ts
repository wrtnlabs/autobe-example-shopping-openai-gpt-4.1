import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validates retrieval of a single administrator profile by ID with correct
 * permissions.
 *
 * Business Context:
 *
 * - This test ensures an authenticated administrator with appropriate rights can
 *   fetch another administrator account's details, confirming the API returns
 *   all normalized, public fields and never leaks sensitive authentication data
 *   (such as passwords).
 * - The scenario involves two distinct steps: setup by creating an administrator
 *   (which also ensures permissions are ready), and retrieval by a different
 *   (implicit or same-connection) admin user.
 *
 * Steps:
 *
 * 1. Create a new administrator using the provided API function, with known/random
 *    details and a valid permission assignment.
 * 2. Retrieve the created administrator by ID using the GET API endpoint as an
 *    admin connection.
 * 3. Validate that:
 *
 *    - All defined IAimallBackendAdministrator fields (id, permission_id, email,
 *         name, status, created_at, updated_at) are present and correct.
 *    - No sensitive authentication data (e.g., password hashes, secrets) are leaked
 *         in the response.
 *    - The returned details match what was initially created (where applicable).
 */
export async function test_api_aimall_backend_administrator_administrators_getByAdministratorid(
  connection: api.IConnection,
) {
  // 1. Create a new administrator to ensure a valid UUID exists for lookup
  const createInput: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>(),
    name: RandomGenerator.name(),
    status: "active",
  };
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: createInput },
    );
  typia.assert(admin);

  // 2. Retrieve administrator details using its UUID
  const result: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.at(
      connection,
      { administratorId: admin.id },
    );
  typia.assert(result);

  // 3. Validate all response fields are correct and sensitive fields are not present
  TestValidator.equals("id matches")(result.id)(admin.id);
  TestValidator.equals("permission_id matches")(result.permission_id)(
    admin.permission_id,
  );
  TestValidator.equals("email matches")(result.email)(admin.email);
  TestValidator.equals("name matches")(result.name)(admin.name);
  TestValidator.equals("status matches")(result.status)(admin.status);
  TestValidator.predicate("created_at should be present and ISO timestamp")(
    typeof result.created_at === "string" &&
      !isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate("updated_at should be present and ISO timestamp")(
    typeof result.updated_at === "string" &&
      !isNaN(Date.parse(result.updated_at)),
  );
  // No additional/sensitive fields should be present
  const keys = Object.keys(result);
  const allowed = [
    "id",
    "permission_id",
    "email",
    "name",
    "status",
    "created_at",
    "updated_at",
  ];
  TestValidator.equals("returned fields are strictly normalized")(keys.sort())(
    allowed.sort(),
  );
}
