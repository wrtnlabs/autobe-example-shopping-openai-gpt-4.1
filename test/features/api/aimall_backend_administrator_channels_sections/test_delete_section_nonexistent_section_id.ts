import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate API behavior when attempting to delete a section with a non-existent
 * or already-deleted sectionId.
 *
 * Ensures the delete endpoint
 * /aimall-backend/administrator/channels/{channelId}/sections/{sectionId}
 * responds with a 404 error when provided with a valid channelId but a
 * sectionId that does not exist or has already been deleted.
 *
 * This test is important to confirm:
 *
 * - The endpoint does not allow deletion of sections that do not exist (integrity
 *   check).
 * - The system provides an appropriate error (404 Not Found) without leaking
 *   internal errors.
 * - Side-effect auditing is invoked (not directly testable here).
 *
 * Steps:
 *
 * 1. Provision a new channel (to have a valid channelId).
 * 2. Generate a random UUID for sectionId that is not present under this channel.
 * 3. Call DELETE
 *    /aimall-backend/administrator/channels/{channelId}/sections/{sectionId}.
 * 4. Assert that the API call throws an error (404 expected).
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_delete_section_nonexistent_section_id(
  connection: api.IConnection,
) {
  // 1. Provision a new channel to get a valid channelId
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.alphabets(12),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Prepare a random, non-existent sectionId
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt section deletion with valid channelId but non-existent sectionId
  await TestValidator.error("non-existent sectionId should return 404 error")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.sections.erase(
        connection,
        {
          channelId: channel.id,
          sectionId: nonExistentSectionId,
        },
      );
    },
  );
}
