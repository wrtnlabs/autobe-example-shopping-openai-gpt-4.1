import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_channel_delete_invalid_channelid_fail(
  connection: api.IConnection,
) {
  /**
   * Validates that the system prevents deletion of non-existent sales channels.
   *
   * 1. Registers a new admin account (establishes authentication context).
   * 2. Attempts to soft-delete a sales channel by using a random channelId
   *    (guaranteeing non-existence in DB).
   * 3. Asserts that an error is thrown, confirming proper enforcement of business
   *    rules and API error handling for invalid channelId operations.
   */
  // 1. Register admin and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@e2etest.com`,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2 & 3. Attempt delete with invalid channelId and assert error thrown
  const invalidChannelId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "system should reject deletion with non-existent channelId",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.erase(
        connection,
        {
          channelId: invalidChannelId,
        },
      );
    },
  );
}
