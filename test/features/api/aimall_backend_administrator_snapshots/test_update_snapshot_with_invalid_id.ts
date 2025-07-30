import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate error handling for updating a snapshot record with an invalid or
 * non-existent snapshot ID.
 *
 * Business context: Administrative users may occasionally attempt to update
 * metadata for community snapshot/media records by ID, but if the snapshotId
 * does not exist, the system must not perform any update and should return a
 * not found error. This test ensures that invalid operations do not update any
 * snapshot data, and that proper error semantics are followed.
 *
 * Test steps:
 *
 * 1. Attempt to update a snapshot by invoking the update endpoint with a random
 *    UUID that does not correspond to any existing snapshot record.
 * 2. Provide a valid IAimallBackendSnapshot.IUpdate body with at least one
 *    updatable field (caption/media_uri), ensuring the request itself is
 *    structurally valid.
 * 3. Assert that the request results in an error (typically 404 Not Found or an
 *    API-level not found error), and that no data is updated or created as a
 *    result of the call.
 * 4. Optionally, validate that the failure does not affect the database state (if
 *    observable in this context) and that error-handling or audit logging
 *    mechanisms are triggered (as per business audit requirements).
 * 5. No change in state or side effects should occur for a non-existent snapshot
 *    record.
 */
export async function test_api_aimall_backend_administrator_snapshots_test_update_snapshot_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that will not match any existing snapshot record
  const invalidSnapshotId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid update body (with at least one updatable property)
  const updateBody: IAimallBackendSnapshot.IUpdate = {
    caption: "Should not update",
    media_uri: "https://dummy.example.com/image.png",
  };

  // 3. Attempt the update and expect error (such as NotFound)
  await TestValidator.error("updating nonexistent snapshot should error")(
    async () => {
      await api.functional.aimall_backend.administrator.snapshots.update(
        connection,
        {
          snapshotId: invalidSnapshotId,
          body: updateBody,
        },
      );
    },
  );
}
