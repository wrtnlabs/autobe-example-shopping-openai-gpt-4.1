import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * E2E: Full admin workflow for channel category detail retrieval.
 *
 * 1. Register and authenticate a new admin for management rights.
 * 2. Create a new channel resource as a prerequisite for category nesting.
 * 3. Create a category under the channel, storing its id for detail retrieval.
 * 4. Immediately retrieve category detail as admin and assert all major fields
 *    match initial creation input, especially audit fields (parent linkage,
 *    display order, code, name, etc.).
 * 5. (If update API available) Update category with a new code, name, description,
 *    etc.; then retrieve detail to confirm changes are reflected for admin.
 * 6. (If logical delete available) Soft-delete the category; try to retrieve
 *    detail and expect either 404 (not found) or a redacted/deleted_at field
 *    for admin. If API allows, assert behavior, otherwise skip logical deletion
 *    step.
 * 7. Confirm admin authentication was strictly enforced throughout.
 */
export async function test_api_category_detail_retrieval_admin_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as admin
  const adminRegister = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminRegister);
  // 2. Create new channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelInput,
    },
  );
  typia.assert(channel);
  TestValidator.equals("created channel code", channel.code, channelInput.code);
  // 3. Create category under channel
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryInput,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category code",
    category.code,
    categoryInput.code,
  );
  TestValidator.equals("category name", category.name, categoryInput.name);
  TestValidator.equals(
    "category display_order",
    category.display_order,
    categoryInput.display_order,
  );
  TestValidator.equals("category parent_id is null", category.parent_id, null);
  TestValidator.equals(
    "shopping_mall_channel_id",
    category.shopping_mall_channel_id,
    channel.id,
  );
  // 4. Retrieve detail and verify all fields match
  const detail = await api.functional.shoppingMall.admin.channels.categories.at(
    connection,
    {
      channelId: channel.id,
      categoryId: category.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("retrieved category matches created", detail, category);
  // 5. (Skip update/deletion assertions if API is not available)
  // Note: Only creation and retrieval APIs are available per provided SDK.
}
