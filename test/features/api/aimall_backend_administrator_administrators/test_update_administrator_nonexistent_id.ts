import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate robust error handling when attempting to update an AIMall
 * administrator with a non-existent UUID.
 *
 * This test verifies that the API responds with an appropriate error (404 Not
 * Found or validation error) when a PUT request is made to update an
 * administrator, but the administratorId used in the URL does not correspond to
 * any existing administrator record in the system.
 *
 * Steps:
 *
 * 1. Generate a random valid UUID for administratorId that is (very likely) not
 *    present (do not create such an administrator beforehand).
 * 2. Construct a valid update body payload.
 * 3. Attempt to call PUT
 *    /aimall-backend/administrator/administrators/{administratorId} with this
 *    bogus UUID and valid body.
 * 4. Assert that the request results in an error, indicating that the resource
 *    cannot be found (404) or is otherwise rejected for validation/business
 *    logic reasons (e.g., the UUID isn't recognized).
 * 5. Do not assert on the exact error message or code, only verify that an error
 *    is thrown and no successful update occurs.
 */
export async function test_api_aimall_backend_administrator_administrators_test_update_administrator_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Generate a random non-existent administratorId
  const bogusAdministratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Construct a valid update body payload
  const updateData: IAimallBackendAdministrator.IUpdate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>(),
    name: "Test Admin",
    status: "active",
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };

  // Step 3 & 4: Attempt update and assert that an error is thrown
  await TestValidator.error(
    "Should fail with 404 or validation error for non-existent administratorId",
  )(async () => {
    await api.functional.aimall_backend.administrator.administrators.update(
      connection,
      {
        administratorId: bogusAdministratorId,
        body: updateData,
      },
    );
  });
}
