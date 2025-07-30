import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Test that deletion of a channel fails when sections exist and succeeds after
 * sections are deleted.
 *
 * Business requirement: The platform must prevent hard deletion of a channel
 * while dependent section records exist (foreign key integrity). Only after all
 * sections are removed should the channel be deletable. This protects
 * referential and UI consistency.
 *
 * Steps:
 *
 * 1. Create a new channel (POST /aimall-backend/administrator/channels)
 * 2. Add a section under this channel (POST
 *    /aimall-backend/administrator/channels/{channelId}/sections)
 * 3. Attempt to delete the channel while its section still exists (DELETE
 *    /aimall-backend/administrator/channels/{channelId}), expecting an error
 *    due to foreign key constraint or dependency.
 * 4. Delete the section (DELETE
 *    /aimall-backend/administrator/channels/{channelId}/sections/{sectionId})
 * 5. Retry deletion of the channel (DELETE
 *    /aimall-backend/administrator/channels/{channelId}) and expect success.
 */
export async function test_api_aimall_backend_administrator_channels_test_delete_channel_with_existing_sections_fails(
  connection: api.IConnection,
) {
  // 1. Create a new channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph()(2),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Add a section to the newly created channel
  const section =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph()(2),
          display_order: 1,
          enabled: true,
        } satisfies IAimallBackendSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Attempt to delete the channel (should fail due to section dependency)
  await TestValidator.error("channel delete fails with existing section")(() =>
    api.functional.aimall_backend.administrator.channels.erase(connection, {
      channelId: channel.id,
    }),
  );

  // 4. Delete the section to remove the dependency
  await api.functional.aimall_backend.administrator.channels.sections.erase(
    connection,
    {
      channelId: channel.id,
      sectionId: section.id,
    },
  );

  // 5. Retry deleting the channel (should now succeed)
  await api.functional.aimall_backend.administrator.channels.erase(connection, {
    channelId: channel.id,
  });
}
