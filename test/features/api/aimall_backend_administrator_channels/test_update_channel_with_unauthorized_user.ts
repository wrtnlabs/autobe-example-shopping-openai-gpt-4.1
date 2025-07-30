import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate that unauthorized (non-admin) users cannot update channel
 * information.
 *
 * This test ensures the RBAC system denies update attempts by users who do not
 * have 'administrator' privileges. The test procedure:
 *
 * 1. Simulate a non-admin (unauthorized) user context (e.g., by omitting admin
 *    login or using a standard user token if available).
 * 2. Prepare a test channel ID (could be random or a fixed test UUID).
 * 3. Prepare an update request body with changed data for the channel.
 * 4. Attempt to call the update API as the unauthorized user.
 * 5. Verify that the operation results in an HttpError (authorization failure),
 *    i.e., error is thrown.
 * 6. Optionally (if possible), verify that the underlying channel resource has not
 *    been changed.
 */
export async function test_api_aimall_backend_administrator_channels_test_update_channel_with_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Setup: Create a random test channel id and update body
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const update: IAimallBackendChannel.IUpdate = {
    code: "UNAUTHORIZED-UPDATE",
    name: "Should-Not-Change",
    enabled: false,
  };

  // 2. Try to update the channel as a non-admin/unauthorized user
  await TestValidator.error("non-admin users cannot update channel")(
    async () =>
      await api.functional.aimall_backend.administrator.channels.update(
        connection,
        {
          channelId,
          body: update,
        },
      ),
  );
}
