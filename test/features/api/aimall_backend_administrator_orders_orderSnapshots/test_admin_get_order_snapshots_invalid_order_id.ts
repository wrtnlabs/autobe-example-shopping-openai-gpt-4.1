import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Test retrieving order snapshots for a non-existent orderId as administrator.
 *
 * This test validates that when an administrator attempts to retrieve order
 * snapshot records for an orderId that does not exist in the system (such as a
 * random UUID), the API responds with an appropriate not found error and does
 * not return any sensitive data or internal system information. This confirms
 * robust access controls and correct error handling for invalid resources.
 *
 * Steps:
 *
 * 1. Generate a random UUID to serve as a fake/non-existent orderId.
 * 2. Attempt to call the administrator orderSnapshots API with this invalid
 *    orderId.
 * 3. Assert that an error is thrown (e.g., a 404 Not Found error or function-level
 *    error is raised).
 * 4. Ensure no data or order snapshot information is returned, and that no
 *    internal server information is leaked in the error response.
 *
 * This test defends against accidental data leakage when requesting resources
 * that do not exist and ensures compliance with security best practices by
 * validating graceful API failure scenarios.
 */
export async function test_api_aimall_backend_administrator_orders_orderSnapshots_index_invalid_order_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent orderId UUID
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve order snapshots for the invalid orderId and assert error is thrown
  await TestValidator.error("Not found for non-existent orderId")(() =>
    api.functional.aimall_backend.administrator.orders.orderSnapshots.index(
      connection,
      {
        orderId: invalidOrderId,
      },
    ),
  );
}
