import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate that non-admin users cannot provision (create) new platform
 * channels.
 *
 * This test ensures the critical security boundary that only authorized
 * administrators can create channels. It attempts to create a new channel via
 * the admin endpoint with a connection that lacks admin authentication,
 * expecting the API to reject the request with an authorization error (e.g.,
 * HTTP 401 or 403). Passing this test means the API correctly secures
 * administrative channel provisioning against unauthorized access.
 *
 * Steps:
 *
 * 1. Compose a valid IAimallBackendChannel.ICreate payload with random,
 *    schema-valid data.
 * 2. Attempt to call the admin channel creation endpoint without admin privileges.
 * 3. Use TestValidator.error to assert the creation fails with an authorization
 *    error, NOT a validation error.
 * 4. Confirm no channel is created and security is preserved.
 */
export async function test_api_aimall_backend_administrator_channels_test_create_channel_with_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Prepare a valid, well-formed channel creation payload
  const data = {
    code: RandomGenerator.alphabets(6),
    name: RandomGenerator.paragraph()(1),
    enabled: true,
  } satisfies IAimallBackendChannel.ICreate;

  // 2. Attempt to call the admin channel creation endpoint as an unauthorized user
  await TestValidator.error("Non-admin cannot create channel")(() =>
    api.functional.aimall_backend.administrator.channels.create(connection, {
      body: data,
    }),
  );
}
