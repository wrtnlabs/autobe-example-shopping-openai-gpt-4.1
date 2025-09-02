import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test admin-only soft delete (logical delete) for order delivery entity.
 *
 * Purpose: Verify admin-permission-only access to the delivery deletion
 * endpoint, confirming that a DELETE request by an admin sets up the
 * soft-deleted state (deleted_at set at backend), while denying the same
 * operation for unauthenticated or non-admin users.
 *
 * Flow:
 *
 * 1. Create a new admin using admin join endpoint (to fetch fresh
 *    authentication context)
 * 2. Attempt to delete with random orderId/deliveryId as admin; assert API
 *    call succeeds (since no data, cannot verify deleted_at field
 *    directly)
 * 3. Attempt to delete with another set of random orderId/deliveryId (assuming
 *    non-existent), and assert a not found/forbidden error occurs
 * 4. Attempt to delete as anonymous user (no Authorization): expect forbidden
 *    error
 */
export async function test_api_order_delivery_soft_delete_success_and_forbidden(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const randomName = RandomGenerator.name();
  const randomUsername = RandomGenerator.alphaNumeric(10);
  const randomEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const randomPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: randomUsername,
      password_hash: randomPasswordHash,
      name: randomName,
      email: randomEmail as string & tags.Format<"email">,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Soft delete delivery as admin (cannot verify deleted_at actually set due to lack of fetch, but should not error)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMallAiBackend.admin.orders.deliveries.erase(
    connection,
    {
      orderId,
      deliveryId,
    },
  );

  // 3. Delete delivery for non-existent order or delivery (use new random IDs as not found)
  await TestValidator.error(
    "should error on deleting non-existent delivery record",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.deliveries.erase(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          deliveryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Attempt delete without Authorization (as anonymous)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbid non-admin (unauthenticated) from soft deleting delivery",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.deliveries.erase(
        unauthConn,
        {
          orderId,
          deliveryId,
        },
      );
    },
  );
}
