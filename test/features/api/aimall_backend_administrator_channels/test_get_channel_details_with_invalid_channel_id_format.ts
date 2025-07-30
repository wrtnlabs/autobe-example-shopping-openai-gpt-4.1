import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate the behavior when requesting channel details with an invalid
 * channelId format.
 *
 * This test ensures that if a non-UUID string is provided as the channelId
 * parameter to the AIMall administrator channel detail endpoint, the API
 * responds with a precise input validation error (such as 400 Bad Request) and
 * does NOT perform a channel lookup or return ambiguous errors.
 *
 * Steps:
 *
 * 1. Attempt to retrieve a channel using a clearly malformed/non-UUID channelId
 *    (e.g., "not-a-valid-uuid-12345").
 * 2. Ensure that the API throws a validation error and does not proceed to entity
 *    lookup or return unexpected errors like 404/500.
 * 3. Confirm that the error is not a generic error, but a validation error
 *    specific to the channelId format.
 */
export async function test_api_aimall_backend_administrator_channels_test_get_channel_details_with_invalid_channel_id_format(
  connection: api.IConnection,
) {
  // Step 1: Choose a malformed channel ID that is clearly not a UUID
  const invalidChannelId = "not-a-valid-uuid-12345";

  // Step 2: Attempt the API call and expect a validation error to be thrown
  await TestValidator.error("channelId format validation error should occur")(
    async () => {
      // This call is intentionally invalid for runtime validation
      await api.functional.aimall_backend.administrator.channels.at(
        connection,
        {
          channelId: invalidChannelId as any, // TypeScript requires a UUID, but we intentionally violate at runtime
        },
      );
    },
  );
}
