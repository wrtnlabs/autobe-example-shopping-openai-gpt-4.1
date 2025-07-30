import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test inventory snapshot access control for SKU by snapshot ID.
 *
 * This test verifies that only administrator accounts can retrieve inventory
 * snapshot details via the relevant endpoint. It checks that access is
 * correctly enforced:
 *
 * - An admin can retrieve a specific inventory snapshot for a SKU without error.
 * - Non-admin and anonymous users are forbidden or unauthorized when attempting
 *   this operation.
 *
 * Test steps:
 *
 * 1. As administrator (precondition: connection is authenticated as admin), call
 *    the endpoint with valid IDs and expect success.
 * 2. As non-administrator user (connection without admin privilege), attempt to
 *    fetch the inventory snapshot and expect access denied (e.g., 401/403
 *    error).
 * 3. As unauthenticated (no credentials at all), attempt to fetch and expect
 *    unauthorized error.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_inventory_snapshot_access_control_enforced(
  connection: api.IConnection,
) {
  // Step 1: Retrieve inventory snapshot as administrator
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const inventorySnapshotId = typia.random<string & tags.Format<"uuid">>();

  // It is assumed the provided `connection` is authenticated as a valid administrator.
  let snapshot: IAimallBackendInventorySnapshot | null = null;
  try {
    snapshot =
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.at(
        connection,
        { skuId, inventorySnapshotId },
      );
    typia.assert(snapshot);
  } catch (err) {
    throw new Error(
      "Admin should be able to access inventory snapshot but failed.",
    );
  }

  // Step 2: Attempt as non-admin user (simulate by removing/invalidating admin privileges on connection)
  // (In practice, you would use a real non-admin user and get their connection; here, we clear the Authorization header as a placeholder.)
  const nonAdminConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete nonAdminConnection.headers["Authorization"];
  TestValidator.error("Non-admin user cannot access inventory snapshot")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.at(
        nonAdminConnection,
        { skuId, inventorySnapshotId },
      );
    },
  );

  // Step 3: Attempt as unauthenticated user (no headers at all)
  const anonConnection = { ...connection, headers: {} };
  TestValidator.error("Anonymous user cannot access inventory snapshot")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.at(
        anonConnection,
        { skuId, inventorySnapshotId },
      );
    },
  );
}
