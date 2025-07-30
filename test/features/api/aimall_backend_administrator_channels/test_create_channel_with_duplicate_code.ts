import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate that channel creation fails when using a duplicate code.
 *
 * This test ensures the system enforces the uniqueness constraint on the
 * channel code field. If an attempt is made to create a second channel with a
 * code already used by an existing channel, the API should reject the request
 * with a conflict or validation error.
 *
 * Steps:
 *
 * 1. Create a new channel with a unique code.
 * 2. Attempt to create a second channel using the same code.
 * 3. Assert that the second creation attempt fails, thereby confirming the
 *    uniqueness constraint is enforced.
 *
 * This protects the reliability of programmatic lookups and prevents accidental
 * or malicious duplication of channels.
 */
export async function test_api_aimall_backend_administrator_channels_test_create_channel_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create the first channel with a unique code
  const code = RandomGenerator.alphaNumeric(8);
  const name = RandomGenerator.name();
  const createBody: IAimallBackendChannel.ICreate = {
    code,
    name,
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: createBody },
    );
  typia.assert(channel);
  TestValidator.equals("created channel code")(channel.code)(code);
  TestValidator.equals("created channel name")(channel.name)(name);
  TestValidator.equals("enabled flag")(channel.enabled)(true);

  // 2. Attempt to create a second channel with the same code
  const duplicateBody: IAimallBackendChannel.ICreate = {
    code, // duplicate
    name: RandomGenerator.name(),
    enabled: true,
  };
  await TestValidator.error("duplicate code should fail")(() =>
    api.functional.aimall_backend.administrator.channels.create(connection, {
      body: duplicateBody,
    }),
  );
}
