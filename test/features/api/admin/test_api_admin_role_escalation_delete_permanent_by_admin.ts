import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that an authenticated admin can permanently delete an admin role
 * escalation request.
 *
 * 1. Register & authenticate a new admin (admin1). This also sets auth headers.
 * 2. Simulate an existing role escalation request (random UUIDs for adminId and
 *    escalationId).
 * 3. As admin, perform a DELETE on the escalation.
 * 4. Simulate that after deletion, the escalation cannot be found (if relevant GET
 *    endpoint existed).
 * 5. Try the same DELETE as an unauthenticated user and verify error (only admins
 *    allowed).
 * 6. Validate business context: operation succeeds only for admins, complies with
 *    compliance/audit requirements (log/audit is implied; not checkable in
 *    E2E).
 */
export async function test_api_admin_role_escalation_delete_permanent_by_admin(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Simulate known escalation record
  const adminId = admin.id;
  const escalationId = typia.random<string & tags.Format<"uuid">>();
  // (Assume this escalationId exists in system for adminId, as no create API exists to provision it)

  // 3. Authenticated admin performs permanent delete
  await api.functional.shoppingMall.admin.admins.roleEscalations.erase(
    connection,
    {
      adminId,
      escalationId,
    },
  );

  // 4. Simulate that after deletion the escalation cannot be found (no GET endpoint available)
  // (Can't actually perform because no API. In real test, would GET and expect 404/error.)

  // 5. Attempt DELETE as unauthenticated/non-admin user, expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "erase must fail for unauthenticated user",
    async () => {
      await api.functional.shoppingMall.admin.admins.roleEscalations.erase(
        unauthConn,
        {
          adminId,
          escalationId,
        },
      );
    },
  );

  // 6. (Compliance/audit log validation cannot be performed via E2E test, as no API or data structure exposes the logs.)
}
