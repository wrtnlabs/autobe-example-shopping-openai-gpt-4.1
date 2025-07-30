import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate that requesting section details via GET with invalid or mismatched
 * channelId and sectionId returns 404 not found errors.
 *
 * Business context: Sections belong to channels, and each section's parent
 * channel must match when fetching details. Retrieving a section with the wrong
 * or non-existent sectionId, or a mismatching channel/section linkage, must
 * cause proper 404 errors, never leaking entity presence nor cross-linking
 * data.
 *
 * Test Steps:
 *
 * 1. Provision a valid channel to have an existing channel ID for testing
 *    (dependency).
 * 2. Attempt to fetch a section with a valid channelId but an invalid/random
 *    (non-existent) sectionId and expect a 404 error.
 * 3. Attempt to fetch a section with both channelId and sectionId as random
 *    unrelated UUIDs, and expect a 404 error.
 * 4. Confirm that error is thrown and no section data is returned, validating that
 *    no entity is leaked and linkage integrity is enforced.
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_get_section_detail_with_invalid_ids_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Provision a valid channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph()(1),
          enabled: true,
        },
      },
    );
  typia.assert(channel);

  // 2. Try to fetch a section with a legitimate channelId but a random sectionId
  await TestValidator.error(
    "section by valid channel, invalid sectionId should 404",
  )(async () => {
    await api.functional.aimall_backend.administrator.channels.sections.at(
      connection,
      {
        channelId: channel.id,
        sectionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 3. Try to fetch a section with both channelId and sectionId as random unrelated UUIDs
  await TestValidator.error(
    "section by bogus channel and sectionId should 404",
  )(async () => {
    await api.functional.aimall_backend.administrator.channels.sections.at(
      connection,
      {
        channelId: typia.random<string & tags.Format<"uuid">>(),
        sectionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
