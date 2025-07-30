import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate security: unauthorized order list access is forbidden.
 *
 * Verifies that the seller orders listing endpoint (GET
 * /aimall-backend/seller/orders) is protected from unauthenticated access
 * attempts. Ensures business/order data cannot be retrieved without proper
 * credentials, guarding against data leakage to unauthorized actors.
 *
 * Step-by-step:
 *
 * 1. Attempt to access the endpoint without an Authorization header – must fail
 *    (401/403).
 * 2. Validate that an error is thrown using TestValidator.error(curried syntax) –
 *    do not inspect error details.
 * 3. (Scenario focus: unauthenticated actor only; multi-seller context is not
 *    covered unless infra supports it.)
 *
 * No authentication or test data setup is needed; this is a pure
 * negative/access control test.
 */
export async function test_api_aimall_backend_seller_orders_test_seller_orders_list_rejects_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Prepare a connection WITHOUT authentication/Authorization header
  const unauthenticatedConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete unauthenticatedConnection.headers.Authorization;

  // 2. Attempt access and assert forbidden/unauthenticated error
  TestValidator.error("Unauthenticated order list access should be rejected")(
    async () => {
      await api.functional.aimall_backend.seller.orders.index(
        unauthenticatedConnection,
      );
    },
  );
}
