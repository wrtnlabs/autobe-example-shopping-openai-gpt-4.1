import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

/**
 * Test admin soft-deletion (logical deletion) of a channel.
 *
 * This E2E test ensures that an admin can logically delete (soft-delete) a
 * sales channel using the admin API. The workflow also validates that the
 * deletion is idempotent (multiple delete attempts do not error and do not
 * further alter state), and that the operation marks the 'deleted_at'
 * timestamp but does not physically remove the record. Due to SDK
 * constraints, reloading the channel to verify the 'deleted_at' timestamp
 * post-deletion is not feasible, so state is only asserted where possible.
 * All data are generated randomly for isolation, and all operations are
 * type safe.
 *
 * Workflow:
 *
 * 1. Register and login as an admin
 * 2. Create a channel (with random/unique values)
 * 3. Delete (soft-delete) the channel
 * 4. Assert (after creation) its 'deleted_at' field is null
 * 5. Repeat deletion to ensure idempotence; confirm no error thrown
 */
export async function test_api_channel_soft_delete_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and login new admin
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const passwordHash: string = RandomGenerator.alphaNumeric(32); // simulated hash

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: RandomGenerator.name(2),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const createdChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: channelInput,
      },
    );
  typia.assert(createdChannel);
  TestValidator.equals(
    "channel created code matches input",
    createdChannel.code,
    channelInput.code,
  );
  TestValidator.equals(
    "channel not deleted initially",
    createdChannel.deleted_at,
    null,
  );

  // 3. Delete (soft-delete) the channel
  await api.functional.shoppingMallAiBackend.admin.channels.erase(connection, {
    channelId: createdChannel.id,
  });

  // 4. Second deletion to confirm idempotency (should not throw error)
  await api.functional.shoppingMallAiBackend.admin.channels.erase(connection, {
    channelId: createdChannel.id,
  });
}
