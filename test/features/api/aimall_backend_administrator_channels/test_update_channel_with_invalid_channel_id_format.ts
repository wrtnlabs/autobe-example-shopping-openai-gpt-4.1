import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Test updating a channel with an invalid channelId (malformed UUID).
 *
 * This test checks that the update API correctly validates the channelId path
 * parameter, rejecting requests with a malformed (non-UUID) identifier. The
 * endpoint should not process the update if the identifier format is invalid,
 * returning a validation error. No channel should be updated on the backend.
 *
 * Steps:
 *
 * 1. Create a valid IAimallBackendChannel.IUpdate object with random allowed
 *    values.
 * 2. Attempt to update using a clearly invalid channelId (e.g., "not-a-uuid").
 * 3. Assert that the API throws a validation error caused by the malformed
 *    identifier.
 */
export async function test_api_aimall_backend_administrator_channels_test_update_channel_with_invalid_channel_id_format(
  connection: api.IConnection,
) {
  // 1. Prepare a valid and random IAimallBackendChannel.IUpdate payload.
  const updatePayload: IAimallBackendChannel.IUpdate = {
    code: "WEB-" + RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.paragraph()(1),
    enabled: Math.random() < 0.5 ? true : false,
  };

  // 2. ChannelId deliberately set to a value not matching the uuid format.
  const invalidChannelId = "not-a-uuid";

  // 3. Perform the update call and check for validation error on channelId format.
  await TestValidator.error(
    "malformed channelId (UUID format) should be rejected",
  )(async () => {
    await api.functional.aimall_backend.administrator.channels.update(
      connection,
      {
        channelId: invalidChannelId as any, // force invalid input for test
        body: updatePayload,
      },
    );
  });
}
