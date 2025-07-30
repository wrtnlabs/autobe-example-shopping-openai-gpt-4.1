import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test that unauthorized or non-admin users cannot access the administrator
 * order list endpoint.
 *
 * This test ensures that RBAC (Role-Based Access Control) is enforced on the
 * /aimall-backend/administrator/orders endpoint, preventing unauthorized
 * clients from accessing sensitive order data. The endpoint should return an
 * explicit error (such as HTTP 403 Forbidden) when accessed by a user without
 * appropriate admin or seller privileges.
 *
 * Steps:
 *
 * 1. Attempt to access the API endpoint without any admin or seller
 *    authentication.
 * 2. Assert that the response is an error, confirming access is refused.
 * 3. Confirm no order data is exposed to unauthorized clients.
 */
export async function test_api_aimall_backend_administrator_orders_test_orders_list_unauthorized_access_rejected(
  connection: api.IConnection,
) {
  // Attempt to get the administrator order listing without admin privileges
  await TestValidator.error("unauthorized admin order list access is blocked")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.index(
        connection,
      );
    },
  );
}
