import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Test attempting to create an administrator with a non-existent permission_id.
 *
 * This test ensures the API enforces referential integrity when assigning
 * permissions to administrators. It attempts to create a new administrator
 * account with a permission_id that does not exist, expecting the API to reject
 * the request with a validation or integrity error.
 *
 * Steps:
 *
 * 1. Generate a random UUID to serve as a non-existent permission_id.
 * 2. Construct a valid administrator creation payload, using the invalid
 *    permission_id for the permission assignment.
 * 3. Attempt to create the administrator via the API and assert that it fails with
 *    an error.
 */
export async function test_api_aimall_backend_administrator_administrators_test_create_administrator_with_invalid_permission_id(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent permission_id (random UUID)
  const invalidPermissionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Construct admin creation payload with valid random values and the invalid permission_id
  const adminPayload = {
    permission_id: invalidPermissionId,
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IAimallBackendAdministrator.ICreate;

  // 3. Attempt to create admin and expect error due to invalid permission reference
  await TestValidator.error("should fail - permission_id does not exist")(
    async () => {
      await api.functional.aimall_backend.administrator.administrators.create(
        connection,
        {
          body: adminPayload,
        },
      );
    },
  );
}
