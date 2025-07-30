import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate section code uniqueness constraint under a channel.
 *
 * This test verifies that within a single channel, section codes must be
 * unique. It adds a new channel, then creates a section under it with a
 * specific code. Next, it attempts to create a second section under the same
 * channel using an identical section code, and expects a uniqueness violation
 * (error) to occur on the second attempt. This confirms that the backend
 * enforces code-uniqueness per channel for sections.
 *
 * 1. Create a new channel (code and name randomly generated, enabled)
 * 2. Create the first section under that channel
 *
 *    - Use a unique section code, name, display order, enabled=true
 * 3. Attempt to create a second section under the same channel using the exact
 *    same code (different name allowed)
 * 4. Validate that an error is thrown for uniqueness constraint violation on code
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_create_section_duplicate_code_within_channel_fails(
  connection: api.IConnection,
) {
  // 1. Create a new channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.alphabets(8),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create the first section
  const sectionCode = RandomGenerator.alphaNumeric(5);
  const section1 =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          channel_id: channel.id,
          code: sectionCode,
          name: RandomGenerator.alphabets(7),
          display_order: 1,
          enabled: true,
        } satisfies IAimallBackendSection.ICreate,
      },
    );
  typia.assert(section1);
  TestValidator.equals("section1 code")(section1.code)(sectionCode);

  // 3. Attempt to create a second section with the same code under the same channel
  await TestValidator.error(
    "duplicate section code within channel should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          channel_id: channel.id,
          code: sectionCode, // same code as above
          name: RandomGenerator.alphabets(7),
          display_order: 2,
          enabled: true,
        } satisfies IAimallBackendSection.ICreate,
      },
    );
  });
}
