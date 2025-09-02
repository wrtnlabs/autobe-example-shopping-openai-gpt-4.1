import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

/**
 * Test successful update of a sales channel's configuration by an admin.
 *
 * This scenario validates:
 *
 * 1. Admin registration & authentication
 * 2. Creation of an initial sales channel using the admin account
 * 3. Update operation on the channel (changing name, description, currency,
 *    timezone)
 * 4. Asserts the update is reflected, updated_at timestamp changes, and core
 *    identifiers are unchanged
 * 5. Confirms update logic operates as expected for channel management use
 *    cases
 *
 * Test steps:
 *
 * 1. Register and authenticate admin (POST /auth/admin/join)
 * 2. Create sales channel (POST /shoppingMallAiBackend/admin/channels)
 * 3. Update channel fields (PUT
 *    /shoppingMallAiBackend/admin/channels/{channelId})
 * 4. Assert response: updated fields, updated_at, and stability of non-updated
 *    fields
 */
export async function test_api_channel_update_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminInput = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create a new sales channel as admin
  const createInput = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const createdChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: createInput },
    );
  typia.assert(createdChannel);

  // 3. Update the channel (name, description, currency, timezone)
  const updateInput = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency: "USD",
    timezone: "America/New_York",
  } satisfies IShoppingMallAiBackendChannel.IUpdate;
  const updatedChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.update(
      connection,
      {
        channelId: createdChannel.id,
        body: updateInput,
      },
    );
  typia.assert(updatedChannel);

  // 4. Validate updated and stable fields
  TestValidator.equals(
    "channel name updated",
    updatedChannel.name,
    updateInput.name,
  );
  TestValidator.equals(
    "channel description updated",
    updatedChannel.description,
    updateInput.description,
  );
  TestValidator.equals(
    "channel currency updated",
    updatedChannel.currency,
    updateInput.currency,
  );
  TestValidator.equals(
    "channel timezone updated",
    updatedChannel.timezone,
    updateInput.timezone,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedChannel.updated_at,
    createdChannel.updated_at,
  );
  TestValidator.equals(
    "channel id stable",
    updatedChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel code stable",
    updatedChannel.code,
    createdChannel.code,
  );
  TestValidator.equals(
    "channel country stable",
    updatedChannel.country,
    createdChannel.country,
  );
  TestValidator.equals(
    "channel language stable",
    updatedChannel.language,
    createdChannel.language,
  );
}
