import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItemSnapshot";
import type { IPageIShoppingMallAiBackendOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderItemSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_order_item_snapshot_index_permission_and_filtering(
  connection: api.IConnection,
) {
  /**
   * Test admin search and permission on order item snapshots (with different
   * filters and error/edge cases).
   *
   * FLOW:
   *
   * 1. Register/authenticate as admin (provides Authorization for admin-only API)
   * 2. Query /shoppingMallAiBackend/admin/orders/{orderId}/itemSnapshots with
   *    random UUIDs and various filters; validate response shape
   * 3. Test for error: invalid orderId (should fail)
   * 4. Test for error: unauthenticated access (should be rejected)
   * 5. Confirm behavior when there are no snapshots (expect empty list)
   *
   * The test does not attempt to create actual orders/items/snapshots, as such
   * APIs are not provided. Only structural/permission flows are exercised.
   */

  // 1. Register/authenticate as admin
  const username = RandomGenerator.alphaNumeric(8);
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${username}@example.com` as string & tags.Format<"email">,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // 2. Search with valid format random orderId; expect empty data if no real order exists
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  const searchResponse =
    await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.index(
      connection,
      {
        orderId: randomOrderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "pagination page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty data set on unknown orderId",
    Array.isArray(searchResponse.data) ? searchResponse.data.length : 0,
    0,
  );

  // 3. Apply additional search filters (all random, but valid types)
  const filteredResponse =
    await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.index(
      connection,
      {
        orderId: randomOrderId,
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          snapshot_reason: RandomGenerator.pick([
            "after_sale",
            "return",
            "admin_update",
          ] as const),
          created_at: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IShoppingMallAiBackendOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered page current value",
    filteredResponse.pagination.current,
    filteredResponse.pagination.current,
  );
  TestValidator.predicate(
    "filtered response data is array",
    Array.isArray(filteredResponse.data),
  );

  // 4. Error case: syntactically invalid orderId
  await TestValidator.error(
    "invalid orderId format should trigger validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.index(
        connection,
        {
          orderId: "not-a-uuid" as any,
          body: {},
        },
      );
    },
  );

  // 5. Error case: no authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.index(
        unauthConn,
        {
          orderId: randomOrderId,
          body: {},
        },
      );
    },
  );
}
