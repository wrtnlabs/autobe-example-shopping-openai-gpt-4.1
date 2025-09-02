import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import type { EOrderReturnStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderReturnStatus";
import type { IPageIShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderReturn";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_return_list_by_admin_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Test unauthorized access to admin's order return list.
   *
   * This test verifies that attempting to call the admin order return list
   * endpoint (PATCH /shoppingMallAiBackend/admin/orders/{orderId}/returns)
   * without authentication (absent Authorization header) will result in an
   * authentication/authorization error, such as HTTP 401 Unauthorized or 403
   * Forbidden. This ensures proper enforcement of security policy, preventing
   * unauthenticated users from accessing protected admin endpoints.
   *
   * Steps:
   *
   * 1. Prepare API connection without Authorization (simulate unauthenticated
   *    state)
   * 2. Attempt to call the endpoint with a random order ID and valid body payload
   * 3. Assert that the operation fails due to lack of admin authentication
   * 4. Do not perform any admin join or login before the request - strictly
   *    unauthenticated
   */

  // 1. Prepare unauthorized connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Compose random orderId and valid request body (may be empty)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const body = {} satisfies IShoppingMallAiBackendOrderReturn.IRequest;

  // 3. Assert that the operation throws a 401/403 error (access denied)
  await TestValidator.error(
    "unauthorized admin order return list should throw access error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.index(
        unauthConn,
        {
          orderId,
          body,
        },
      );
    },
  );
}
