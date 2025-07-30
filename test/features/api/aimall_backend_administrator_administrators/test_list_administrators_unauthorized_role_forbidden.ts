import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate forbidden access to administrator list for non-admin users.
 *
 * This test simulates a user without administrator privileges attempting to
 * access the administrator listing endpoint. According to the API contract,
 * listing admin accounts is accessible only to authenticated administrators
 * with sufficient permissions. Attempting this as a non-admin should result in
 * an access denied or forbidden response.
 *
 * Steps:
 *
 * 1. Assume the connection is set for a non-admin user (without administrator
 *    privileges).
 * 2. Attempt to call the API: GET /aimall-backend/administrator/administrators
 * 3. Assert that the request is denied, raising an error (forbidden/unauthorized).
 */
export async function test_api_aimall_backend_administrator_administrators_test_list_administrators_unauthorized_role_forbidden(
  connection: api.IConnection,
) {
  // 1. Simulate a connection with a non-admin user account.
  // (Assume the provided `connection` does NOT have admin privileges)

  // 2. Attempt to access administrators list and expect forbidden error
  await TestValidator.error("Access denied for non-admin")(async () => {
    await api.functional.aimall_backend.administrator.administrators.index(
      connection,
    );
  });
}
