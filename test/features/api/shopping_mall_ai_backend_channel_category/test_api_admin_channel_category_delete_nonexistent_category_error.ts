import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

export async function test_api_admin_channel_category_delete_nonexistent_category_error(
  connection: api.IConnection,
) {
  /**
   * E2E test: Attempting to delete a non-existent (already deleted) channel
   * category triggers an appropriate error.
   *
   * Business context:
   *
   * - Admins can soft delete channel categories, but repeated deletion must fail
   *   with a business error (not-found/idempotent) per platform evidence,
   *   compliance, and audit rules.
   * - This test ensures business rule enforcement and robust error handling for
   *   attempts to delete non-existent or already deleted resources.
   *
   * Steps:
   *
   * 1. Register a new admin account and acquire authentication.
   * 2. Create a channel (required for category).
   * 3. Create a category within the channel.
   * 4. Delete the category (valid soft-delete operation).
   * 5. Attempt to delete the same category again; verify an error is thrown
   *    indicating the category does not exist or was already deleted.
   */

  // 1. Register a new admin and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a channel
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          country: "KR",
          currency: "KRW",
          language: "ko-KR",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create a category under this channel
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          order: 0,
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Delete the category (first, valid delete)
  await api.functional.shoppingMallAiBackend.admin.channels.categories.erase(
    connection,
    {
      channelId: channel.id,
      categoryId: category.id,
    },
  );

  // 5. Attempt to delete the same category again; expect error
  await TestValidator.error(
    "second deletion of already deleted category triggers error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.erase(
        connection,
        {
          channelId: channel.id,
          categoryId: category.id,
        },
      );
    },
  );
}
