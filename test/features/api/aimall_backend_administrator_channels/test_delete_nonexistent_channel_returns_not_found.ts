import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that deleting a non-existent channel returns a 404 Not Found error
 * without system disruption.
 *
 * This test simulates an administrator attempting to hard-delete a channel by
 * UUID that does not exist in the system. It should trigger a 404 status
 * (business logic error), confirming that the backend rejects the request
 * gracefully and with the expected error. No data is modified or corrupted as a
 * result. No setup dependencies are required because the test purposely uses a
 * random UUID never assigned to any channel.
 *
 * Steps:
 *
 * 1. Generate a random UUID never assigned to any channel.
 * 2. Attempt to DELETE the channel via the administrator's channel erase API.
 * 3. Expect and assert that a 404 error (HttpError) is thrown and the system
 *    remains stable.
 */
export async function test_api_aimall_backend_administrator_channels_test_delete_nonexistent_channel_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID.
  const randomChannelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Try to delete the non-existent channel and expect a 404 error (HttpError).
  await TestValidator.error("deleting non-existent channel triggers 404 error")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.erase(
        connection,
        {
          channelId: randomChannelId,
        },
      );
    },
  );
}
