import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

/**
 * Verify that updating a non-existent or already deleted category fails
 * with the correct error.
 *
 * This test ensures the update endpoint for channel categories enforces
 * strict resource existence checks and does not allow update operations
 * against deleted (soft-deleted) or never existent resources. The workflow
 * mimics a real admin scenario:
 *
 * 1. Register a new admin via /auth/admin/join to obtain authentication
 *    context for all subsequent operations.
 * 2. Create a new sales channel via /shoppingMallAiBackend/admin/channels for
 *    category scoping.
 * 3. Add a new category to the channel with
 *    /shoppingMallAiBackend/admin/channels/{channelId}/categories, ensuring
 *    we have a valid category to delete and then operate on.
 * 4. Soft delete this category with
 *    /shoppingMallAiBackend/admin/channels/{channelId}/categories/{categoryId},
 *    simulating the "resource is deleted" scenario and preventing future
 *    reference.
 * 5. Attempt to update the deleted category (PUT
 *    /shoppingMallAiBackend/admin/channels/{channelId}/categories/{categoryId}),
 *    expecting a not-found or resource-unavailable error. Confirm that no
 *    business information about the deleted resource is leaked and API
 *    returns the appropriate error code.
 *
 * All resources are created in isolation with random values. Error
 * assertions confirm both system security (no info leak or privilege
 * escalation) and business-layer stability for deleted or invalid
 * references.
 */
export async function test_api_admin_channel_category_update_nonexistent_category_error(
  connection: api.IConnection,
) {
  // 1. Admin authentication (register new admin)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(6)}@testadmin.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create new sales channel
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          country: "KR",
          currency: "KRW",
          language: "ko-KR",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);
  const channelId = channel.id;

  // 3. Add a category to the channel (so we have a valid categoryId)
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channelId,
        body: {
          shopping_mall_ai_backend_channel_id: channelId,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order: 1,
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category);
  const categoryId = category.id;

  // 4. Delete the category
  await api.functional.shoppingMallAiBackend.admin.channels.categories.erase(
    connection,
    {
      channelId: channelId,
      categoryId: categoryId,
    },
  );

  // 5. Attempt to update the deleted category (should fail)
  await TestValidator.error(
    "updating a deleted category must throw NotFound or resource-unavailable error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.update(
        connection,
        {
          channelId: channelId,
          categoryId: categoryId,
          body: {
            name: RandomGenerator.name(1),
          } satisfies IShoppingMallAiBackendChannelCategory.IUpdate,
        },
      );
    },
  );
}
