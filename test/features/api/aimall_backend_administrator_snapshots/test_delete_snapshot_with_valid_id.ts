import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate deletion of a snapshot as an administrator by ID.
 *
 * Ensures that administrators can create and then permanently delete a
 * snapshot. After deletion, attempts to delete again should result in a failure
 * (snapshot not found), testing permanent removal. Audit logging is noted as
 * system-level (not testable via API).
 *
 * Steps:
 *
 * 1. Create a snapshot as setup (dependency)
 * 2. Delete the snapshot by its ID
 * 3. Attempt a repeated delete to ensure it was removed (should throw an error)
 */
export async function test_api_aimall_backend_administrator_snapshots_test_delete_snapshot_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a snapshot for deletion test setup
  const snapshot =
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      {
        body: {
          media_uri: typia.random<string>(),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 2. Delete the snapshot by snapshotId
  await api.functional.aimall_backend.administrator.snapshots.erase(
    connection,
    {
      snapshotId: snapshot.id,
    },
  );

  // 3. Try deleting again; should fail because the resource no longer exists
  await TestValidator.error("deleting already deleted snapshot fails")(() =>
    api.functional.aimall_backend.administrator.snapshots.erase(connection, {
      snapshotId: snapshot.id,
    }),
  );
}
