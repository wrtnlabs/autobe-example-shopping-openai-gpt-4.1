import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

export async function test_api_admin_channel_category_retrieve_not_found(
  connection: api.IConnection,
) {
  /**
   * This test verifies that attempting to retrieve a deleted category returns
   * an appropriate not found error, ensuring that once a category is soft
   * deleted, it cannot be accessed via normal detail APIs and that no data is
   * leaked.
   *
   * Steps:
   *
   * 1. Register an admin account and authenticate.
   * 2. Create a channel to scope categories.
   * 3. Create a category within the channel.
   * 4. Delete (soft-delete) the category.
   * 5. Attempt to retrieve the deleted category, expecting a not found error or
   *    proper error response.
   * 6. Attempt to retrieve a completely bogus (random UUID) category as a further
   *    not found check.
   *
   * Business rules validated:
   *
   * - A soft-deleted or non-existent category cannot be read by admin detail API.
   * - Error handling for invalid IDs is correct and does not leak data.
   */

  // 1. Register an admin account and authenticate.
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@business.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResp);

  // 2. Create a channel
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create a category
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order: 1,
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Soft delete the category
  await api.functional.shoppingMallAiBackend.admin.channels.categories.erase(
    connection,
    {
      channelId: channel.id,
      categoryId: category.id,
    },
  );

  // 5. Attempt to retrieve the deleted (soft-deleted) category, expect not found error
  await TestValidator.error(
    "retrieving soft-deleted category returns not found",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.at(
        connection,
        {
          channelId: channel.id,
          categoryId: category.id,
        },
      );
    },
  );

  // 6. Attempt to retrieve a completely random (non-existent) categoryId in this channel
  await TestValidator.error(
    "retrieving completely invalid category returns not found",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.at(
        connection,
        {
          channelId: channel.id,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
