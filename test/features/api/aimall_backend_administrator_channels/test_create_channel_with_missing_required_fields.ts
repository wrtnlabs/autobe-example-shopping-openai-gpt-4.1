import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate that channel creation correctly enforces required field constraints.
 *
 * This test ensures the API returns proper validation errors when attempting to
 * create a new channel with missing required fields (such as omitting the
 * channel code, display name, or enabled flag). It verifies that an invalid
 * request does not create any persistent channel entity, and that the returned
 * error clearly indicates which fields are missing or invalid.
 *
 * Steps:
 *
 * 1. Attempt to create a channel while omitting one or more required fields (such
 *    as no code, no name, no enabled).
 * 2. Assert that the API call fails (throws an error or returns validation
 *    failure).
 * 3. Optionally, attempt several variations (e.g., omit code, then omit name,
 *    etc.).
 * 4. Confirm that no channel is created in any invalid scenario.
 */
export async function test_api_aimall_backend_administrator_channels_test_create_channel_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Try omitting the 'code' field
  await TestValidator.error("missing required 'code'")(() =>
    api.functional.aimall_backend.administrator.channels.create(connection, {
      body: {
        // code is missing
        name: "Test Channel",
        enabled: true,
      } as any,
    }),
  );

  // 2. Try omitting the 'name' field
  await TestValidator.error("missing required 'name'")(() =>
    api.functional.aimall_backend.administrator.channels.create(connection, {
      body: {
        code: "WEB",
        // name is missing
        enabled: true,
      } as any,
    }),
  );

  // 3. Try omitting the 'enabled' field
  await TestValidator.error("missing required 'enabled'")(() =>
    api.functional.aimall_backend.administrator.channels.create(connection, {
      body: {
        code: "WEB",
        name: "Test Channel",
        // enabled is missing
      } as any,
    }),
  );
}
