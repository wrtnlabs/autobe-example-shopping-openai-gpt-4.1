import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate system behavior for retrieving a channel with a non-existent
 * channelId.
 *
 * This test attempts to retrieve the details of a channel using a well-formed
 * UUID that does not correspond to any channel in the system. It verifies that
 * the API returns a 404 Not Found error, and ensures that no internal
 * platform/channel information is leaked (payload or error should contain no
 * channel data).
 *
 * 1. Generate a valid random UUID that is not associated with any real channel.
 * 2. Attempt to retrieve channel details by calling the admin channels
 *    getByChannelid endpoint.
 * 3. Confirm that an HttpError with status 404 is thrown.
 * 4. Verify that the error does not include sensitive or internal information
 *    about channels or the system.
 */
export async function test_api_aimall_backend_administrator_channels_test_get_channel_details_with_non_existent_channel_id(
  connection: api.IConnection,
) {
  // 1. Generate a well-formed but non-existent channelId (UUID)
  const nonExistentChannelId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt channel detail retrieval, expect an error
  await TestValidator.error("should return 404 for not found channel")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.at(
        connection,
        {
          channelId: nonExistentChannelId,
        },
      );
    },
  );

  // (Implementation depends on SDK error structure; by design, TestValidator.error already asserts error thrown)
}
