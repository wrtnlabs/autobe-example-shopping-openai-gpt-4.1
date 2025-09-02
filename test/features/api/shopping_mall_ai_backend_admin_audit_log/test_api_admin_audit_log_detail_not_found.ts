import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";

export async function test_api_admin_audit_log_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate that requesting a non-existent audit log detail by a valid admin
   * returns a 404 error without leaking information.
   *
   * Test Steps:
   *
   * 1. Register (and authenticate) a new admin, obtain their adminId.
   * 2. Use that adminId with a random, non-existent auditLogId to request audit
   *    log detail.
   * 3. Verify that the response is an error with status 404 (not found) and no
   *    sensitive information is leaked.
   */
  // Step 1: Register and authenticate a new admin
  const uniqueEmail: string = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const uniqueUsername: string = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: uniqueUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: uniqueEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Use a random UUID that shouldn't exist for auditLogId
  const adminId: string = adminJoin.admin.id;
  const randomAuditLogId: string = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "should return 404 not found for non-existent audit log id",
    404,
    async () => {
      await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.at(
        connection,
        {
          adminId,
          auditLogId: randomAuditLogId,
        },
      );
    },
  );
}
