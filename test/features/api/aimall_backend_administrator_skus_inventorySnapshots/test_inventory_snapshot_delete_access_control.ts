import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate access control on hard-deleting an inventory snapshot via
 * administrator API endpoint.
 *
 * This test ensures only authorized administrator users can delete SKU
 * inventory snapshots. It attempts a delete operation as an
 * unauthorized/non-admin user, expecting an HTTP 403 Forbidden or 401
 * Unauthorized error without any data deletion.
 *
 * Steps:
 *
 * 1. Generate random UUIDs for skuId and inventorySnapshotId (real data cannot be
 *    created due to unavailable DTO/API).
 * 2. Attempt to call the DELETE API as a user lacking admin privileges (assumed
 *    unauthenticated or with standard user context).
 * 3. Assert that an error is thrown indicating insufficient permission (403/401),
 *    verifying test passes only if access is rejected.
 * 4. Do NOT test real data deletion due to missing setup/creation APIs/DTOs –
 *    focus on access control only.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_delete_access_control(
  connection: api.IConnection,
) {
  // Step 1: Generate random valid UUIDs for path parameters
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const inventorySnapshotId = typia.random<string & tags.Format<"uuid">>();

  // Step 2-3: Attempt deletion as unauthorized user; expect error
  await TestValidator.error("forbidden for non-admin")(async () => {
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.erase(
      connection,
      { skuId, inventorySnapshotId },
    );
  });
}
