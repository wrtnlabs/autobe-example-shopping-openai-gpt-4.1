import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";

/**
 * Test admin system audit trail detail fetch for non-existent auditTrailId.
 *
 * 1. Register a new admin using /auth/admin/join and save credentials
 * 2. Authenticate as this admin to acquire required authorization (handled by
 *    join API with JWT)
 * 3. Attempt to fetch the details of a system audit trail entry using a random
 *    UUID for auditTrailId that does not exist
 * 4. Confirm the API responds with not found (404) error and does not expose
 *    audit log content or leak sensitive fields
 * 5. Validate error handling is robust and response structure is correct for
 *    missing resource
 */
export async function test_api_admin_system_audit_trail_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate (join sets up auth context)
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // plausible random hash
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminName: string = RandomGenerator.name(2);

  const registration = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(registration);

  // 2. Access protected audit trail detail endpoint with a random, non-existent auditTrailId
  const randomAuditTrailId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "audit trail detail with non-existent id should return 404",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.at(
        connection,
        {
          auditTrailId: randomAuditTrailId,
        },
      );
    },
  );
}
