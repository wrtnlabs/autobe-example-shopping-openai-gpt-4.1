import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate error handling when fetching a snapshot by a nonexistent or deleted
 * snapshotId.
 *
 * Ensures the system correctly responds with a not found error (404) and does
 * not expose any internal details when an invalid/nonexistent UUID is used for
 * fetching snapshot metadata.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is virtually guaranteed not to exist as a
 *    snapshotId.
 * 2. Attempt to fetch snapshot metadata with this UUID.
 * 3. Assert that a 404 error (or general error) is thrown, with no
 *    internal/leakage details validated (per E2E convention).
 */
export async function test_api_aimall_backend_administrator_snapshots_test_get_single_snapshot_by_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, nonexistent snapshotId
  const nonexistentSnapshotId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt the query and assert that an error is thrown (404 expected)
  await TestValidator.error("should return not found for missing snapshot")(
    async () => {
      await api.functional.aimall_backend.administrator.snapshots.at(
        connection,
        {
          snapshotId: nonexistentSnapshotId,
        },
      );
    },
  );
}
