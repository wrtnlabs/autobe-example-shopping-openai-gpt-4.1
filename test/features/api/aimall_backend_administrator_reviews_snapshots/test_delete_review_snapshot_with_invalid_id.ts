import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling when attempting to delete a review snapshot with
 * invalid or non-existent IDs (as an administrator).
 *
 * This test ensures that the API properly handles attempts to delete
 * non-existent review snapshots, by providing invalid UUIDs for both reviewId
 * and snapshotId as an administrator. The response should be an appropriate
 * error (such as 404 Not Found), and should not return sensitive data in the
 * error structure. This is important to guarantee robust error handling and
 * information security.
 *
 * Steps:
 *
 * 1. Attempt to delete a snapshot with randomly generated (non-existent) reviewId
 *    and snapshotId.
 * 2. Confirm that an error occurs (ideally 404 Not Found), validating the system
 *    prevents deletion of non-existent resources.
 * 3. Ensure that no sensitive information is present in the error response (only
 *    general error info is returned).
 */
export async function test_api_aimall_backend_administrator_reviews_snapshots_test_delete_review_snapshot_with_invalid_id(
  connection: api.IConnection,
) {
  await TestValidator.error("should fail to delete non-existent snapshot")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.snapshots.erase(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
