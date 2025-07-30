import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate that a platform administrator can successfully hard-delete a channel
 * by UUID without dependent records.
 *
 * This test ensures that channel deletion operates as a true hard-delete (not
 * soft), and that the channel becomes fully irretrievable after removal.
 *
 * Steps:
 *
 * 1. Provision a new unique test channel via create API.
 * 2. Retrieve the created channel's details to assert successful creation.
 * 3. Delete the channel by its UUID using the hard-delete (erase) API.
 * 4. Attempt to retrieve channel details—confirm error/absence, proving
 *    hard-delete success.
 *
 * Coverage:
 *
 * - Full lifecycle: create, lookup, delete, verify removal
 * - Uniqueness and absence of dependents are enforced by creation of a brand new
 *   entity with no links.
 * - Post-deletion, API attempts to find the deleted channel must fail (e.g.,
 *   throw or return not found).
 */
export async function test_api_aimall_backend_administrator_channels_test_delete_channel_successful_hard_delete(
  connection: api.IConnection,
) {
  // 1. Provision a new unique channel
  const channelInput: IAimallBackendChannel.ICreate = {
    code: `TEST-${RandomGenerator.alphaNumeric(8)}`,
    name: `Test Channel ${RandomGenerator.alphabets(5)}`,
    enabled: true,
  };
  const created: IAimallBackendChannel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(created);

  // 2. Retrieve the created channel & confirm existence
  const found: IAimallBackendChannel =
    await api.functional.aimall_backend.administrator.channels.at(connection, {
      channelId: created.id,
    });
  typia.assert(found);
  TestValidator.equals("id matches on detail retrieval")(found.id)(created.id);
  TestValidator.equals("code matches")(found.code)(channelInput.code);
  TestValidator.equals("name matches")(found.name)(channelInput.name);

  // 3. Delete the channel by UUID
  await api.functional.aimall_backend.administrator.channels.erase(connection, {
    channelId: created.id,
  });

  // 4. Attempt to retrieve the deleted channel and check for appropriate error/absence
  await TestValidator.error("Channel must be gone after hard-delete")(
    async () =>
      await api.functional.aimall_backend.administrator.channels.at(
        connection,
        { channelId: created.id },
      ),
  );
}
