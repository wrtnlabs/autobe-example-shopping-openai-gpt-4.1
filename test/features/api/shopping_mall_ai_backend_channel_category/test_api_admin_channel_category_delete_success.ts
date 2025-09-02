import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

/**
 * Validate admin soft-deletion (logical deletion) of a channel category.
 *
 * Scenario: ensure an authenticated admin can create a channel and a
 * category within it, logically delete the category via the proper API, and
 * that the category is no longer returned in active listings or detail
 * fetches. The test checks proper admin authentication, resource presence
 * before and after deletion, business constraints on soft-delete
 * (deleted_at field), and overall type safety/compliance.
 *
 * Steps:
 *
 * 1. Create and authenticate a unique admin via join API
 * 2. Create a channel under admin context
 * 3. Create a channel category within the new channel
 * 4. Perform soft-delete on the category
 * 5. Check via category detail fetch that deleted_at is set (if such API
 *    exists)
 */
export async function test_api_admin_channel_category_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a unique admin & authenticate
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${adminUsername}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // for demonstration; in production must be a real hash
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a new sales channel
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create a new channel category under this channel
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order: 1,
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "Category is active before deletion",
    category.deleted_at,
    null,
  );

  // 4. Perform the logical delete (soft delete)
  await api.functional.shoppingMallAiBackend.admin.channels.categories.erase(
    connection,
    {
      channelId: channel.id,
      categoryId: category.id,
    },
  );

  // 5. Attempt to validate the deleted-at flag. As the SDK does not include a detail or list endpoint to fetch the single category, just test creation+deletion and ensure no error occurs.
  // If API surface permitted, would fetch detail here and assert deleted_at is now set to a non-null string in date-time format.
}
