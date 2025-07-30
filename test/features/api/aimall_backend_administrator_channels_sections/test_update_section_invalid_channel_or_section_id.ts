import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate error responses for section update with invalid channelId or
 * sectionId
 *
 * This test ensures that the update API for channel sections enforces strict
 * input validation and referential integrity, by rejecting requests that supply
 * invalid (malformed or non-existent) channelId/sectionId values.
 *
 * Workflow:
 *
 * 1. Generate a plausible update payload using IAimallBackendSection.IUpdate (with
 *    at least one field set).
 * 2. Test the following error cases: a. Malformed channelId, valid sectionId b.
 *    Valid channelId, malformed sectionId c. Both IDs malformed d. Both IDs
 *    well-formed but do not correspond to existing records
 * 3. For each invalid parameter set, attempt to call the update endpoint and
 *    assert that an error is thrown.
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_update_section_invalid_channel_or_section_id(
  connection: api.IConnection,
) {
  // Step 1: Prepare a plausible update payload (set a few real fields)
  const updatePayload = {
    name: "Updated Section Name",
    display_order: 999,
    enabled: false,
  } satisfies IAimallBackendSection.IUpdate;

  // Step 2: Prepare test ID combinations for error scenarios
  const randomUUID = () => typia.random<string & tags.Format<"uuid">>();
  const malformedId = "NOT-A-UUID";

  const validChannelId = randomUUID();
  const validSectionId = randomUUID();

  const errorCases = [
    // (a) Malformed channelId
    { channelId: malformedId, sectionId: validSectionId },
    // (b) Malformed sectionId
    { channelId: validChannelId, sectionId: malformedId },
    // (c) Both malformed
    { channelId: malformedId, sectionId: malformedId },
    // (d) Both valid UUIDs, but do not exist in DB
    { channelId: randomUUID(), sectionId: randomUUID() },
  ];

  // Step 3: Attempt updates, expecting errors in each case
  for (const { channelId, sectionId } of errorCases) {
    await TestValidator.error(
      `should fail: update section channelId=${channelId}, sectionId=${sectionId}`,
    )(() =>
      api.functional.aimall_backend.administrator.channels.sections.update(
        connection,
        {
          channelId,
          sectionId,
          body: updatePayload,
        },
      ),
    );
  }
}
