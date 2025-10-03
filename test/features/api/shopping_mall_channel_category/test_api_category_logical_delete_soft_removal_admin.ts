import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test soft deletion (logical delete) of a category under a channel by admin.
 * Validate that after deletion, the deleted_at field is populated, category is
 * no longer returned in standard lists, and historical audit is preserved.
 * Confirm that attempts to delete already-deleted or non-existent categories
 * return appropriate errors. Scenario includes verification of required admin
 * authentication and that business rules around child references or product
 * assignment (if applicable) are enforced at category deletion.
 */
export async function test_api_category_logical_delete_soft_removal_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a new channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create a new category within this channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Soft-delete the category
  await api.functional.shoppingMall.admin.channels.categories.erase(
    connection,
    {
      channelId: channel.id,
      categoryId: category.id,
    },
  );
  // (No output, but category in DB is now logically deleted, per documentation)

  // 5.a Try to delete the same category again: expect error
  await TestValidator.error(
    "re-deletion of already-deleted category",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.erase(
        connection,
        {
          channelId: channel.id,
          categoryId: category.id,
        },
      );
    },
  );

  // 5.b Try to delete a non-existent category
  await TestValidator.error(
    "deleting non-existent category returns error",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.erase(
        connection,
        {
          channelId: channel.id,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Further verification (if list/index API is available): not implementable with contracts provided, so skipped.
  // Further validation on child references or product assignment: also skipped as API contract does not expose them.
}
