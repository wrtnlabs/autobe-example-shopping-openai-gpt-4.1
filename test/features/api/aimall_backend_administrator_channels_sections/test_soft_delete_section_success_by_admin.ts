import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate the soft deletion (logical deletion) of a section within a channel
 * by an administrator.
 *
 * The test simulates the business sequence for managing sections under a
 * channel, ensuring:
 *
 * - A channel is provisioned and available for use.
 * - At least one section is created within that channel.
 * - The section is then soft deleted via the DELETE endpoint.
 * - After the operation, the section's `deleted_at` should be a set timestamp,
 *   confirming the soft delete (not an actual removal from the DB).
 * - The section should not appear in live/active queries and listings (not tested
 *   here due to lack of list endpoint in the provided APIs), but it still
 *   exists in the backend for auditing and compliance.
 *
 * Sequence:
 *
 * 1. Create a new channel via administrator API.
 * 2. Under this channel, create a new section.
 * 3. Perform soft delete on the created section.
 * 4. Optionally, attempt to retrieve or validate the state of the deleted section
 *    (via future get/list endpoint, if available).
 * 5. Assert that the DELETE operation succeeds and logical constraints are met.
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_soft_delete_section_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new channel as admin
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph()(1),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create a new section under the channel
  const section =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph()(1),
          display_order: 1,
          enabled: true,
        } satisfies IAimallBackendSection.ICreate,
      },
    );
  typia.assert(section);
  TestValidator.equals("section is not deleted at creation")(
    section.deleted_at,
  )(null);

  // 3. Perform soft delete (erase) on the created section
  await api.functional.aimall_backend.administrator.channels.sections.erase(
    connection,
    {
      channelId: channel.id,
      sectionId: section.id,
    },
  );
  // There's no fetch-by-id nor listing endpoint provided in the current APIs to confirm deleted_at directly after delete.
  // To fully confirm in future, fetch section details after delete and check deleted_at is now set (not null),
  // and check it's omitted from active listings.
}
