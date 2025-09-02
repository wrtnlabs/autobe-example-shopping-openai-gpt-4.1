import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";
import type { IPageIShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemAuditTrail";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_system_audit_trail_detail_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Test unauthorized access for system audit trail detail endpoint.
   *
   * 1. Register an admin to guarantee existence of at least one valid audit trail
   *    record.
   * 2. Authenticate as admin and retrieve a real auditTrailId using the system
   *    audit trail index endpoint.
   * 3. Remove authentication (no Authorization header) to simulate non-admin,
   *    unauthenticated session.
   * 4. Attempt to GET
   *    /shoppingMallAiBackend/admin/systemAuditTrails/{auditTrailId} using
   *    unauthorized connection, expecting authorization error (401/403).
   * 5. Assert no system audit record data is leaked in response.
   */
  // 1. Register admin
  const adminUsername = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphabets(6)}@admin-test.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // random hash for admin password
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. As authenticated admin, list system audit trails to obtain a real id
  const auditList =
    await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(auditList);
  TestValidator.predicate(
    "at least one audit trail exists after admin registration",
    auditList.data.length > 0,
  );
  const auditTrailId = auditList.data[0].id;

  // 3. Simulate unauthorized connection (no Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt GET with unauthenticated connection, expecting error (401/403)
  await TestValidator.error(
    "unauthorized GET system audit trail detail should be denied",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.at(
        unauthConnection,
        {
          auditTrailId,
        },
      );
    },
  );
}
