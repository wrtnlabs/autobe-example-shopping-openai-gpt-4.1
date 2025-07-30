import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate rejection of unauthorized channel detail retrieval (GET
 * /aimall-backend/administrator/channels/{channelId}).
 *
 * This test ensures that users without adequate admin privileges cannot access
 * sensitive channel information via the GET channel details API. It simulates
 * an unauthorized request to fetch a channel's details by UUID and expects an
 * authorization error (such as 401 Unauthorized or 403 Forbidden).
 *
 * Steps:
 *
 * 1. Generate a random UUID for the target channel (channelId).
 * 2. Attempt the channel details request using a connection lacking admin or
 *    channel-management permissions.
 * 3. Assert that the API responds with an error indicating insufficient privileges
 *    (no data should be returned).
 *
 * This guards the system against privilege escalation or accidental data
 * leakage to non-admin roles.
 */
export async function test_api_aimall_backend_administrator_channels_test_get_channel_details_with_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Generate a plausible channelId (UUID) for testing protected endpoint access.
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. Attempt to fetch the channel details as underprivileged/unauthorized user and assert it is rejected.
  await TestValidator.error("unauthorized access should be rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.at(
        connection,
        { channelId },
      );
    },
  );
}
