import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendRoleEscalation";
import type { IPageIShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendRoleEscalation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_role_escalation_list_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Verify access control by attempting to list role escalations without admin
   * authentication.
   *
   * Business context: The /shoppingMallAiBackend/admin/roleEscalations endpoint
   * is designed for admin use only, containing sensitive role escalation event
   * logs. It is crucial for business security and compliance that no
   * unauthorized or unauthenticated party can access this data.
   *
   * Test Steps:
   *
   * 1. Register a new admin account to ensure the backing system is initialized
   *    for admin scenarios (do not stay authenticated!)
   * 2. Prepare a fresh connection with empty headers to clear any authentication
   *    context.
   * 3. Attempt to retrieve role escalation snapshots/records without
   *    authentication using PATCH
   *    /shoppingMallAiBackend/admin/roleEscalations.
   * 4. Assert that access is denied (error is thrown) and no sensitive data is
   *    leaked.
   */

  // 1. Register admin (system precondition)
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // 2. Prepare a fresh unauthenticated connection (no Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to list role escalations without authentication
  await TestValidator.error(
    "unauthenticated user cannot list role escalations",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.roleEscalations.index(
        unauthConn,
        {
          body: {}, // Default: no filters, just list
        },
      );
    },
  );
}
