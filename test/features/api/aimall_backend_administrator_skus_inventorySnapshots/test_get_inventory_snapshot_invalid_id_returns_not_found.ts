import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test inventory snapshot access with invalid IDs returns 404 Not Found (no
 * info leakage)
 *
 * This test ensures that when an administrator tries to retrieve an inventory
 * snapshot using random, non-existent UUIDs for both skuId and
 * inventorySnapshotId, the API correctly responds with a 404 Not Found
 * error—without leaking system or resource details. This verifies both endpoint
 * security and proper error handling for unauthorized or incorrect resource
 * access.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for both skuId and inventorySnapshotId (guaranteed
 *    non-existent).
 * 2. Attempt to GET the inventory snapshot at
 *    /aimall-backend/administrator/skus/:skuId/inventorySnapshots/:inventorySnapshotId
 *    using these values.
 * 3. Confirm the endpoint throws an error (e.g., 404) and does not expose internal
 *    data.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_get_inventory_snapshot_invalid_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate random, non-existent UUIDs for both skuId and inventorySnapshotId
  const fakeSkuId = typia.random<string & tags.Format<"uuid">>();
  const fakeInventorySnapshotId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve a snapshot with invalid IDs
  //    Confirm that an error is thrown (404 Not Found), and no sensitive info is leaked
  await TestValidator.error("404 Not Found for invalid inventorySnapshotId")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.at(
        connection,
        {
          skuId: fakeSkuId,
          inventorySnapshotId: fakeInventorySnapshotId,
        },
      );
    },
  );
}
