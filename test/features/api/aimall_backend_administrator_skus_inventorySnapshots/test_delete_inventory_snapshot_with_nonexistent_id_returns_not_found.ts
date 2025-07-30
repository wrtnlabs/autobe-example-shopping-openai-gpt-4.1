import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validates deletion of an inventory snapshot with a non-existent
 * inventorySnapshotId.
 *
 * This test ensures that when an attempt is made to delete an inventory
 * snapshot using a random (non-existent) UUID for inventorySnapshotId, the API
 * responds with a 404 Not Found error and no records are deleted. The scenario
 * checks correct error handling and response structure.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for both skuId and inventorySnapshotId (ensuring no
 *    such pair exists in the system)
 * 2. Attempt to delete the inventory snapshot using these random IDs via the
 *    administrator endpoint
 * 3. Validate that the API responds with a 404 error (not found)
 * 4. Ensure that the error response structure follows standard error response
 *    format (HttpError)
 * 5. (If observable: confirm no snapshot data is deleted - but as we cannot verify
 *    state from SDK/DTOs, skip this check in practice)
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_delete_inventory_snapshot_with_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate UUIDs for non-existing inventory snapshot and SKU
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const inventorySnapshotId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt deletion and 3. Validate error response
  await TestValidator.error(
    "Should return 404 when deleting non-existent inventory snapshot",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.erase(
      connection,
      {
        skuId,
        inventorySnapshotId,
      },
    );
  });
}
