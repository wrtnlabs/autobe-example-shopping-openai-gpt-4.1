import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_order_return_delete_by_admin_invalid_or_not_found(
  connection: api.IConnection,
) {
  /**
   * This test validates error handling of the admin 'delete return' endpoint
   * for cases:
   *
   * 1. Non-existent return (random orderId/returnId),
   * 2. Already-deleted or repeat-deleted return (repeated IDs),
   * 3. Unauthorized admin (missing Authorization header).
   *
   * Each case is validated by ensuring suitable error responses (404 or 403)
   * and no side effects. No valid creation or listing is possible for returns,
   * so the test uses only random data for safety.
   *
   * Step-by-step:
   *
   * 1. Register a unique admin via join endpoint to acquire authorized context.
   * 2. Attempt erase with random non-existent IDs; assert 404.
   * 3. Repeat erase on same IDs to simulate deleted/already-not-exist; assert
   *    still 404.
   * 4. Remove Authorization and attempt erase; assert 403.
   */

  // 1. Register a unique admin for authorization context
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(40), // hash (backend expects hashed value)
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@test-admin.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Attempt erasing a non-existent return
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const returnId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent return should return 404",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.erase(
        connection,
        {
          orderId,
          returnId,
        },
      );
    },
  );

  // 3. Re-attempt erase (already-deleted/deleted or never-existed ID)
  await TestValidator.error(
    "delete already-deleted/non-existent return still returns 404",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.erase(
        connection,
        {
          orderId,
          returnId,
        },
      );
    },
  );

  // 4. Remove Authorization for forbidden scenario
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized erase attempt yields 403",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.returns.erase(
        unauthConn,
        {
          orderId,
          returnId,
        },
      );
    },
  );

  // There is no resource listing or state assertion possible with the available endpoints/types.
}
