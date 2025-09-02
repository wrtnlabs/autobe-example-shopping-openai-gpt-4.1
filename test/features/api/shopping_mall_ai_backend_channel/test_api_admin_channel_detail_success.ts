import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";

export async function test_api_admin_channel_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validate the GET /shoppingMallAiBackend/admin/channels/{channelId} API for
   * retrieving channel detail by id as an admin.
   *
   * This test:
   *
   * 1. Registers a new admin account and logs in to acquire admin privileges and
   *    JWT tokens
   * 2. Creates a new sales channel with distinct business code, configuration, and
   *    locale settings
   * 3. Fetches channel details for the newly created channel via its id
   * 4. Checks that all fields (code, name, country, currency, language, timezone,
   *    description, etc.) match exactly between the creation input and
   *    retrieved detail
   * 5. Asserts that proper admin authentication and API authorization allow
   *    retrieval
   * 6. Validates that the channel is active (not deleted) and timestamps are
   *    present in correct string format
   */

  // 1. Register an admin account and authenticate for all subsequent requests
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create new sales channel as the admin
  const channelCreateInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 16,
    }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelCreateInput },
    );
  typia.assert(channel);

  // 3. Retrieve the channel's detail using its id
  const read = await api.functional.shoppingMallAiBackend.admin.channels.at(
    connection,
    {
      channelId: channel.id,
    },
  );
  typia.assert(read);

  // 4. Field-by-field validation that created and fetched channel details match
  TestValidator.equals("channel id matches", read.id, channel.id);
  TestValidator.equals(
    "channel code matches",
    read.code,
    channelCreateInput.code,
  );
  TestValidator.equals(
    "channel name matches",
    read.name,
    channelCreateInput.name,
  );
  TestValidator.equals(
    "channel description matches",
    read.description,
    channelCreateInput.description,
  );
  TestValidator.equals(
    "country matches",
    read.country,
    channelCreateInput.country,
  );
  TestValidator.equals(
    "currency matches",
    read.currency,
    channelCreateInput.currency,
  );
  TestValidator.equals(
    "language matches",
    read.language,
    channelCreateInput.language,
  );
  TestValidator.equals(
    "timezone matches",
    read.timezone,
    channelCreateInput.timezone,
  );
  TestValidator.equals("deleted_at should be null", read.deleted_at, null);
  TestValidator.predicate(
    "created_at and updated_at are valid nonempty datetime strings",
    typeof read.created_at === "string" &&
      read.created_at.length > 0 &&
      typeof read.updated_at === "string" &&
      read.updated_at.length > 0,
  );
}
