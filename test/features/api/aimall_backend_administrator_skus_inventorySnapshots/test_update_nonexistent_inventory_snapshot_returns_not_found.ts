import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Validate error handling for updating a non-existent inventory snapshot record
 * by SKU and inventorySnapshotId.
 *
 * This test ensures that when an administrator attempts to update an inventory
 * snapshot (change event) for a SKU using IDs that do not correspond to any
 * existing record, the API correctly responds with a 404 Not Found error
 * without modifying any data.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for both skuId and inventorySnapshotId, which should
 *    not exist in the system.
 * 2. Attempt to update the inventory snapshot using the API with a well-formed
 *    update DTO in the body.
 * 3. Validate that a 404 error is thrown.
 * 4. Confirm that the error indicates a Not Found situation and no unexpected side
 *    effects occur.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_update_nonexistent_inventory_snapshot_returns_not_found(
  connection: api.IConnection,
) {
  // Step 1: Prepare random, non-existent IDs
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const inventorySnapshotId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Attempt update on non-existent snapshot
  await TestValidator.error(
    "should return 404 for non-existent inventory snapshot",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.update(
      connection,
      {
        skuId,
        inventorySnapshotId,
        body: {
          change_type: "manual_adjust",
          change_quantity: 10,
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.IUpdate,
      },
    );
  });
}
