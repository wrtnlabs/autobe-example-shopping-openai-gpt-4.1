import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E tests for soft-deletion (logical deletion) of an order item by an
 * admin.
 *
 * Scenario:
 *
 * 1. Register a new admin account using /auth/admin/join (with random
 *    credentials)
 * 2. Simulate (mock) UUIDs for an existing order and order item due to lack of
 *    creation endpoints
 * 3. As the freshly authenticated admin, delete the order item (should succeed
 *    with void response; real verification of deleted_at must be done if
 *    item read API is later available)
 * 4. Edge: Attempt deletion with random non-existent order/item IDs (should
 *    throw error)
 * 5. Edge: Attempt deletion with correct orderId but wrong itemId, and vice
 *    versa
 * 6. Edge: Attempt to re-delete the already-deleted item (should throw or
 *    succeed if idempotent)
 * 7. Permission error: Remove authentication (use empty headers) and try
 *    deletion (should throw error)
 *
 * Limitations:
 *
 * - Cannot check deleted_at field in DB due to missing item read API; this is
 *   noted for future extension.
 */
export async function test_api_admin_order_item_erase_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(40),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@autobe-test.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Simulate UUIDs for existing order and item, since we cannot create them
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();

  // 3. Successful soft deletion as admin (no result to assert; deleted_at cannot be checked with current APIs)
  await api.functional.shoppingMallAiBackend.admin.orders.items.erase(
    connection,
    {
      orderId,
      itemId,
    },
  );
  // (If an item-get API existed, check that the item now has deleted_at set)

  // 4. Delete with random non-existent order/item IDs
  await TestValidator.error(
    "deleting with non-existent orderId and itemId should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.erase(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Delete with correct orderId + wrong itemId, and vice versa
  await TestValidator.error(
    "deleting with correct orderId but random itemId should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.erase(
        connection,
        {
          orderId,
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.error(
    "deleting with random orderId but correct itemId should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.erase(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId,
        },
      );
    },
  );

  // 6. Attempt to re-delete already deleted item (should be idempotent, or may error by business policy)
  await TestValidator.error(
    "re-deleting the already deleted item",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.erase(
        connection,
        {
          orderId,
          itemId,
        },
      );
    },
  );

  // 7. Permission error: unauthenticated erase attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deletion attempt without admin authentication should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.erase(
        unauthConn,
        {
          orderId,
          itemId,
        },
      );
    },
  );
}
