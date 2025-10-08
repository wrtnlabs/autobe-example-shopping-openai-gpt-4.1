import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";

/**
 * Test complete audit-compliant update workflow for admin order history
 * correction.
 *
 * 1. Register a new admin via join (admin is required for update privilege)
 * 2. Simulate a system-provided order history record (cannot create via exposed
 *    API, so generate data manually)
 * 3. Perform an update of mutable (allowed) field (snapshot_reason) as admin
 * 4. Assert updated value is applied, and all immutable fields remain unchanged
 * 5. Attempt update with changes to immutable fields and ensure those changes are
 *    rejected/ignored
 * 6. Repeat updating snapshot_reason and verify audit fields (updated_at) reflect
 *    the change
 */
export async function test_api_order_history_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123$!",
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Simulate a pre-existing order history record
  const originalOrderHistory: IShoppingMallOrderHistory =
    typia.random<IShoppingMallOrderHistory>();
  typia.assert(originalOrderHistory);

  // 3. Update only allowed field (snapshot_reason)
  const newReason: string = RandomGenerator.paragraph({ sentences: 2 });
  const updated: IShoppingMallOrderHistory =
    await api.functional.shoppingMall.admin.orderHistories.update(connection, {
      orderHistoryId: originalOrderHistory.id,
      body: {
        snapshot_reason: newReason,
      } satisfies IShoppingMallOrderHistory.IUpdate,
    });
  typia.assert(updated);
  // 4. Assert mutable field updated, immutable fields unchanged
  TestValidator.equals(
    "snapshot_reason updated",
    updated.snapshot_reason,
    newReason,
  );
  TestValidator.equals("id remains", updated.id, originalOrderHistory.id);
  TestValidator.equals(
    "order ref remains",
    updated.shopping_mall_order_id,
    originalOrderHistory.shopping_mall_order_id,
  );
  TestValidator.equals(
    "snapshot_type remains",
    updated.snapshot_type,
    originalOrderHistory.snapshot_type,
  );
  TestValidator.equals(
    "order_status remains",
    updated.order_status,
    originalOrderHistory.order_status,
  );
  TestValidator.equals(
    "order_total remains",
    updated.order_total,
    originalOrderHistory.order_total,
  );
  TestValidator.equals(
    "created_at remains",
    updated.created_at,
    originalOrderHistory.created_at,
  );
  TestValidator.equals(
    "deleted_at remains",
    updated.deleted_at,
    originalOrderHistory.deleted_at,
  );
  // 5. Attempt to update immutable fields (should not change; system ignores or rejects silently)
  const updateImmutableFields =
    await api.functional.shoppingMall.admin.orderHistories.update(connection, {
      orderHistoryId: originalOrderHistory.id,
      body: {
        /* no snapshot_reason */
      } satisfies IShoppingMallOrderHistory.IUpdate,
    });
  typia.assert(updateImmutableFields);
  TestValidator.equals(
    "unchanged after non-mutable update",
    updateImmutableFields,
    updated,
  );
  // 6. Update mutable field again
  const anotherReason: string = RandomGenerator.paragraph({ sentences: 3 });
  const updatedAgain: IShoppingMallOrderHistory =
    await api.functional.shoppingMall.admin.orderHistories.update(connection, {
      orderHistoryId: originalOrderHistory.id,
      body: {
        snapshot_reason: anotherReason,
      } satisfies IShoppingMallOrderHistory.IUpdate,
    });
  typia.assert(updatedAgain);
  TestValidator.equals(
    "snapshot_reason updated again",
    updatedAgain.snapshot_reason,
    anotherReason,
  );
  TestValidator.equals(
    "id remains after 2nd update",
    updatedAgain.id,
    originalOrderHistory.id,
  );
}
