import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate that updating a section's code to a value that already exists for
 * another section in the same channel fails.
 *
 * Business context: Each section 'code' in a channel must be unique. This test
 * ensures the API enforces the (channel_id, code) unique constraint on update.
 *
 * Workflow steps:
 *
 * 1. Create a new channel as parent context (channelA).
 * 2. Create section1 under channelA with a unique code (e.g., "main-banner").
 * 3. Create section2 under channelA with a different code (e.g., "sub-banner").
 * 4. Attempt to update section2's code to the code of section1 ("main-banner").
 * 5. Expect the update to fail with a conflict error (HTTP 409 or a known conflict
 *    error thrown by the API).
 * 6. As there is no section read API, skip re-load & check of section2.
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_update_section_with_duplicate_code_within_channel(
  connection: api.IConnection,
) {
  // 1. Create a new channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: `CHAN-${RandomGenerator.alphaNumeric(5)}`,
          name: `Test Channel ${RandomGenerator.alphaNumeric(5)}`,
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create section1 with code 'main-banner-xxxx'
  const section1Code = `main-banner-${RandomGenerator.alphaNumeric(4)}`;
  const section1 =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          channel_id: channel.id,
          code: section1Code,
          name: "Main Banner Section",
          display_order: 1,
          enabled: true,
        } satisfies IAimallBackendSection.ICreate,
      },
    );
  typia.assert(section1);

  // 3. Create section2 with code 'sub-banner-xxxx'
  const section2Code = `sub-banner-${RandomGenerator.alphaNumeric(4)}`;
  const section2 =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          channel_id: channel.id,
          code: section2Code,
          name: "Sub Banner Section",
          display_order: 2,
          enabled: true,
        } satisfies IAimallBackendSection.ICreate,
      },
    );
  typia.assert(section2);

  // 4. Try to update section2's code to section1's code (should fail: duplicate)
  await TestValidator.error("fail update: code duplicate in channel")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.sections.update(
        connection,
        {
          channelId: channel.id,
          sectionId: section2.id,
          body: {
            code: section1Code,
          } satisfies IAimallBackendSection.IUpdate,
        },
      );
    },
  );
  // 5. No fetch/read-by-id available for section, so cannot re-check section2 data.
}
