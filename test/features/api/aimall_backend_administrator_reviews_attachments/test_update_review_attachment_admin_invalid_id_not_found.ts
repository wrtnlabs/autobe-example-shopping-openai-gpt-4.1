import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate handling of invalid review/attachment IDs for attachment update by
 * administrator.
 *
 * This test ensures that attempting to update the metadata of a review
 * attachment with IDs (reviewId or attachmentId) that do not correspond to any
 * existing review or attachment results in the appropriate 'not found' error,
 * as per API contract. There should be no changes to existing data.
 *
 * Business/operation context:
 *
 * - An administrator account must be present to perform the operation: provision
 *   admin first.
 * - The update operation uses random UUIDs for both reviewId and attachmentId
 *   that do not exist in the system.
 * - Valid update body for attachment (metadata changes) is provided.
 * - The response is expected to error (likely 404 Not Found) and the system state
 *   must remain unaltered.
 *
 * Test workflow:
 *
 * 1. Provision a new administrator using administrator create API (dependency
 *    setup).
 * 2. Generate random UUIDs that do not match any real review or attachment for use
 *    in the update operation.
 * 3. Attempt to perform the update API call as admin using these non-existent IDs
 *    and a valid update body.
 * 4. Validate that the API responds with an appropriate not found error
 *    (TestValidator.error).
 * 5. Optionally (if API allows), validate system state/logs remain unchanged
 *    (skipped here: cannot validate non-existent records).
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_update_review_attachment_admin_invalid_id_not_found(
  connection: api.IConnection,
) {
  // Step 1: Provision an administrator account for context
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // Step 2: Generate random (invalid/lacking correspondence) UUIDs for review and attachment
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt update and expect error
  await TestValidator.error(
    "should reject update for non-existent review/attachment IDs",
  )(async () => {
    await api.functional.aimall_backend.administrator.reviews.attachments.update(
      connection,
      {
        reviewId: invalidReviewId,
        attachmentId: invalidAttachmentId,
        body: {
          file_uri: typia.random<string>(),
          file_type: typia.random<string>(),
          file_size: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });
}
