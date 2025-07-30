import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Test the successful creation of a new channel as an administrator.
 *
 * This test verifies that when valid and unique channel creation data (code,
 * name, enabled) is provided to the channel creation API as an administrator:
 *
 * 1. The endpoint accepts the request and creates a channel entity.
 * 2. The response contains the full persisted channel entity, including audit
 *    fields (timestamps, id).
 * 3. The returned values match the input (e.g., code, name, enabled flag).
 * 4. The newly created channel is enabled and available for further administrative
 *    use.
 *
 * Steps:
 *
 * 1. Prepare a unique code (short string), display name, and enabled flag for
 *    creation.
 * 2. Call the POST /aimall-backend/administrator/channels API with this data.
 * 3. Assert that the API response returns a valid IAimallBackendChannel object,
 *    matching inputs and containing timestamps/id.
 * 4. (Optional) Optionally, you could list all channels and confirm the new
 *    channel exists (not shown here as only creation endpoint is available).
 */
export async function test_api_aimall_backend_administrator_channels_test_create_channel_with_valid_data_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique test data for the channel
  const uniqueCode = `E2E_${RandomGenerator.alphaNumeric(8)}`;
  const displayName = `Test Channel ${RandomGenerator.alphaNumeric(4)}`;
  const enabled = true;

  // Step 2: Call the API to create the channel
  const created: IAimallBackendChannel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: uniqueCode,
          name: displayName,
          enabled,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(created);

  // Step 3: Validate the resulting entity
  TestValidator.equals("code")(created.code)(uniqueCode);
  TestValidator.equals("name")(created.name)(displayName);
  TestValidator.equals("enabled")(created.enabled)(enabled);
  TestValidator.predicate("id is uuid")(
    typeof created.id === "string" && /^[0-9a-f\-]{36}$/i.test(created.id),
  );
  TestValidator.predicate("created_at is ISO date-time string")(
    !!Date.parse(created.created_at),
  );
  TestValidator.predicate("updated_at is ISO date-time string")(
    !!Date.parse(created.updated_at),
  );
  // The channel is available for use immediately after creation if enabled is true
}
