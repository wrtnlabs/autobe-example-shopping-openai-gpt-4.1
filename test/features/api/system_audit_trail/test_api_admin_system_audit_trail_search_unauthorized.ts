import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";
import type { IPageIShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemAuditTrail";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_system_audit_trail_search_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validates that unauthorized or unauthenticated users cannot search system
   * audit trails.
   *
   * This test ensures that the PATCH
   * /shoppingMallAiBackend/admin/systemAuditTrails endpoint is protected:
   *
   * - No audit log data should be retrievable by clients without proper admin
   *   authentication.
   * - Data must not be accessible with either empty headers (no Authorization) or
   *   any non-admin session.
   *
   * Steps:
   *
   * 1. Construct an explicit unauthenticated connection (headers set to empty
   *    object).
   * 2. Attempt to call the endpoint with an empty search body. Confirm that API
   *    call fails (authorization error).
   * 3. Repeat with a typical filter/search body (e.g., page and limit set,
   *    event_type specified). Confirm denial.
   * 4. Assert no audit trail data is returned under either unauthorized context.
   */

  // 1. Prepare unauthenticated connection (no Authorization header at all)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Unauthenticated search: empty filter (should fail with 401/403, no data exposure)
  await TestValidator.error(
    "unauthenticated user cannot search system audit trails (empty filters)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 3. Unauthenticated search: typical filters (should also fail, no data exposure)
  await TestValidator.error(
    "unauthenticated user cannot search system audit trails (with filters)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemAuditTrails.index(
        unauthConn,
        {
          body: {
            page: 1,
            limit: 10,
            event_type: "config_change",
          },
        },
      );
    },
  );
}
