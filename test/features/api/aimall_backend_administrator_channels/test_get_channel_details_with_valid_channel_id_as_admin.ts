import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate retrieval of channel details (administrator/channel GET).
 *
 * This test ensures that, as an administrator, one can successfully fetch a
 * channel's complete details using its UUID. First, provision a new channel
 * using the create endpoint; then, use the returned channel's `id` as the path
 * parameter for the detail retrieval endpoint. The response must include all
 * fields as per IAimallBackendChannel: id (uuid), code, name, enabled,
 * created_at, updated_at, and all should match values from the channel
 * creation, except for timestamps and id (which are generated).
 *
 * Test Steps:
 *
 * 1. Create a new channel with unique (random) code, name, and enabled flag (using
 *    the POST /aimall-backend/administrator/channels endpoint).
 * 2. Retrieve the newly created channel's detail using GET
 *    /aimall-backend/administrator/channels/{channelId} (use the id from step
 *    1).
 * 3. Assert that the retrieved channel exists and that its properties match those
 *    returned on creation (except id and timestamps validation: id must be the
 *    same, timestamps correctly formatted).
 */
export async function test_api_aimall_backend_administrator_channels_test_get_channel_details_with_valid_channel_id_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a new channel for test
  const input: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph()(1),
    enabled: true,
  };
  const created: IAimallBackendChannel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: input },
    );
  typia.assert(created);

  // 2. Retrieve the channel by its id
  const detail: IAimallBackendChannel =
    await api.functional.aimall_backend.administrator.channels.at(connection, {
      channelId: created.id,
    });
  typia.assert(detail);

  // 3. Assert all key fields
  TestValidator.equals("channel id matches")(detail.id)(created.id);
  TestValidator.equals("code matches")(detail.code)(created.code);
  TestValidator.equals("name matches")(detail.name)(created.name);
  TestValidator.equals("enabled matches")(detail.enabled)(created.enabled);
  TestValidator.predicate("created_at is ISO 8601 format")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(detail.created_at),
  );
  TestValidator.predicate("updated_at is ISO 8601 format")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(detail.updated_at),
  );
}
