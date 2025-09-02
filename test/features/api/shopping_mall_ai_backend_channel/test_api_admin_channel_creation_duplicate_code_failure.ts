import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

export async function test_api_admin_channel_creation_duplicate_code_failure(
  connection: api.IConnection,
) {
  /**
   * Test unique constraint violation for channel creation via admin API.
   *
   * This test verifies that the system prevents creation of multiple sales
   * channels with the same unique code. Steps:
   *
   * 1. Register as a new admin.
   * 2. Create a sales channel (with unique random code).
   * 3. Attempt to create another sales channel with the identical code.
   * 4. Assert that an error occurs and uniqueness is enforced.
   */

  // 1. Register as admin
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminResp = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminResp);
  TestValidator.equals(
    "joined admin username matches input",
    adminResp.admin.username,
    adminJoinInput.username,
  );

  // 2. Create first channel
  const channelCode = RandomGenerator.alphaNumeric(8); // random code for uniqueness test
  const channelCreateInput: IShoppingMallAiBackendChannel.ICreate = {
    code: channelCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  };
  const channelResp =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelCreateInput },
    );
  typia.assert(channelResp);
  TestValidator.equals(
    "created channel code matches input",
    channelResp.code,
    channelCode,
  );

  // 3. Attempt to create a second channel with the same code
  const duplicateChannelInput: IShoppingMallAiBackendChannel.ICreate = {
    code: channelCode, // duplicate code
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  };
  await TestValidator.error(
    "channel code uniqueness constraint is enforced",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.create(
        connection,
        { body: duplicateChannelInput },
      );
    },
  );
}
