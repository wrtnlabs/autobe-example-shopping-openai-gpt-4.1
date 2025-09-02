import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that unauthorized users cannot delete admin files.
 *
 * This test attempts to delete a file from the admin file management
 * endpoint without any admin authentication. No admin join or login is
 * performed; a fresh connection object is used with empty headers (no
 * Authorization). A randomly generated fileId (UUID format) is provided to
 * the delete function. The operation is expected to fail with an
 * authentication/authorization error (HTTP 401 Unauthorized or 403
 * Forbidden), confirming that the secure endpoint properly rejects
 * unauthenticated requests.
 *
 * Steps:
 *
 * 1. Prepare a fresh connection object with no Authorization header
 *    (unauthenticated context).
 * 2. Randomly generate a fileId (UUID) for the deletion attempt.
 * 3. Call the admin file erase API (DELETE
 *    /shoppingMallAiBackend/admin/files/{fileId}) using this unauthorized
 *    connection.
 * 4. Use TestValidator.error to verify an error is thrown for unauthorized
 *    access.
 */
export async function test_api_admin_file_deletion_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthorized connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Randomly choose a UUID for fileId (it is not required to exist)
  const fileId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete as unauthorized
  await TestValidator.error(
    "should throw authorization error when deleting file without authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.erase(unauthConn, {
        fileId,
      });
    },
  );
}
