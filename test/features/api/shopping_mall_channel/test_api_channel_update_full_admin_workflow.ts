import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Validate the full admin-driven workflow for updating a shopping mall channel.
 *
 * 1. Register (admin/join) a new administrator to obtain authentication context.
 * 2. As the admin, create a new shopping mall channel (POST channels).
 * 3. Update the created channel (PUT) with a new name, code, and description.
 * 4. Confirm that the updated channel entity matches the new update data
 *    (name/code/description).
 * 5. Verify the updated_at field was updated.
 */
export async function test_api_channel_update_full_admin_workflow(
  connection: api.IConnection,
) {
  // 1. Register new admin for context
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(adminAuth);

  // 2. Create a channel as admin
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
  } satisfies IShoppingMallChannel.ICreate;
  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreate,
    });
  typia.assert(createdChannel);

  // 3. Prepare update payload with new info
  const updateInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
  } satisfies IShoppingMallChannel.IUpdate;
  const prevUpdatedAt: string & tags.Format<"date-time"> =
    createdChannel.updated_at;

  // 4. Invoke update
  const updatedChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelId: createdChannel.id,
      body: updateInput,
    });
  typia.assert(updatedChannel);

  // 5. Validate new values are correctly reflected
  TestValidator.equals(
    "channel code updated",
    updatedChannel.code,
    updateInput.code,
  );
  TestValidator.equals(
    "channel name updated",
    updatedChannel.name,
    updateInput.name,
  );
  TestValidator.equals(
    "channel description updated",
    updatedChannel.description,
    updateInput.description,
  );

  // 6. Confirm updated_at was modified
  TestValidator.predicate(
    "updated_at timestamp advanced",
    updatedChannel.updated_at !== prevUpdatedAt,
  );
}
