import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Test updating a channel's updatable fields (name and enabled) as an
 * administrator.
 *
 * This E2E test ensures that channels can be updated by an admin using valid
 * data, and the changes to fields such as `name` and `enabled` are properly
 * persisted in the system, while immutable fields (id, code, created_at) remain
 * unaltered except for `updated_at` which should reflect the update time.
 *
 * Steps:
 *
 * 1. Provision a new channel using the create API.
 * 2. Update the `name` and `enabled` fields (valid updatable fields) via the
 *    update API using the channel's id.
 * 3. Verify in the response that:
 *
 *    - The updated fields (`name`, `enabled`) reflect the new values
 *    - Immutable fields (`id`, `code`, `created_at`) remain unchanged
 *    - `updated_at` timestamp is advanced and is later than before
 */
export async function test_api_aimall_backend_administrator_channels_test_update_channel_fields_with_valid_data_as_admin(
  connection: api.IConnection,
) {
  // 1. Provision a new channel
  const originalChannel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: "Original Channel Name",
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(originalChannel);

  // 2. Prepare updated data (change name and enabled status)
  const newName = "Updated Channel Name";
  const newEnabled = !originalChannel.enabled;

  // 3. Update the channel using its id
  const updatedChannel =
    await api.functional.aimall_backend.administrator.channels.update(
      connection,
      {
        channelId: originalChannel.id,
        body: {
          name: newName,
          enabled: newEnabled,
        } satisfies IAimallBackendChannel.IUpdate,
      },
    );
  typia.assert(updatedChannel);

  // 4. Validation: ensure correct fields changed and immutables are unchanged
  TestValidator.equals("id is unchanged")(updatedChannel.id)(
    originalChannel.id,
  );
  TestValidator.equals("code is unchanged")(updatedChannel.code)(
    originalChannel.code,
  );
  TestValidator.equals("name is updated")(updatedChannel.name)(newName);
  TestValidator.equals("enabled is updated")(updatedChannel.enabled)(
    newEnabled,
  );
  TestValidator.equals("created_at is unchanged")(updatedChannel.created_at)(
    originalChannel.created_at,
  );
  TestValidator.predicate("updated_at is advanced")(
    new Date(updatedChannel.updated_at).getTime() >
      new Date(originalChannel.updated_at).getTime(),
  );
}
