import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Validates that an authenticated admin can create and then retrieve the
 * details of a shopping mall channel using
 * /shoppingMall/admin/channels/{channelId}. Ensures business code, name, and
 * description are returned accurately, and that only authenticated admins can
 * retrieve channel details. Tests for error on invalid channelId and
 * unauthorized access.
 *
 * Steps:
 *
 * 1. Register a new admin (to establish an authenticated session).
 * 2. Create a channel as admin to obtain a channelId.
 * 3. Retrieve the channel with admin auth, verify detail contents (code, name,
 *    description should match creation input).
 * 4. Attempt detail retrieval with unauthenticated session (should error/fail).
 * 5. Attempt retrieval with invalid channelId (should error/fail).
 */
export async function test_api_channel_detail_view_by_admin_with_auth(
  connection: api.IConnection,
) {
  // Step 1: Register a unique admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // Step 2: Create a unique channel as the authenticated admin
  const channelCreateBody = {
    code: `test-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies IShoppingMallChannel.ICreate;
  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreateBody,
    });
  typia.assert(createdChannel);

  // Step 3: Retrieve the channel by ID as authenticated admin and verify details
  const fetchedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.at(connection, {
      channelId: createdChannel.id,
    });
  typia.assert(fetchedChannel);
  TestValidator.equals(
    "channel code matches",
    fetchedChannel.code,
    channelCreateBody.code,
  );
  TestValidator.equals(
    "channel name matches",
    fetchedChannel.name,
    channelCreateBody.name,
  );
  TestValidator.equals(
    "channel description matches",
    fetchedChannel.description,
    channelCreateBody.description,
  );

  // Step 4: Attempt retrieval with unauthenticated connection (should be forbidden/unauthorized)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot retrieve channel detail",
    async () => {
      await api.functional.shoppingMall.admin.channels.at(unauthConn, {
        channelId: createdChannel.id,
      });
    },
  );

  // Step 5: Attempt retrieval with invalid (random) channelId (should error/not found)
  await TestValidator.error("retrieving invalid channelId fails", async () => {
    await api.functional.shoppingMall.admin.channels.at(connection, {
      channelId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
