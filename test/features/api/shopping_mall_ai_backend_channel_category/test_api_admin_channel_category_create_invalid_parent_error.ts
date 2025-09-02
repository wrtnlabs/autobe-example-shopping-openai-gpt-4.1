import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";

export async function test_api_admin_channel_category_create_invalid_parent_error(
  connection: api.IConnection,
) {
  /**
   * Validate hierarchical category creation validation for nonexistent
   * parent_id in sales channels.
   *
   * Ensures that the admin-level endpoint enforcing channel category creation
   * disallows setting a parent_id to a UUID that does not exist (or is
   * soft-deleted) within the target channel. Maintains hierarchical data
   * integrity and enforces backend validation rules.
   *
   * Steps:
   *
   * 1. Authenticate as a new admin, ensuring the account and access token are in
   *    place.
   * 2. Create a new sales channel to serve as the context for category operations.
   * 3. Attempt to create a new category in the channel, referencing a random
   *    (invalid) parent_id that is guaranteed to not exist (no category of that
   *    ID is created prior to test, nor does it belong to the channel).
   * 4. Validate that the API call fails with a business logic or referential
   *    integrity error. Test passes only if an error (validation or not found)
   *    is properly thrown.
   */

  // 1. Admin authentication
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(7)}@test.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Channel creation for test scope
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 3. Prepare random, definitely-invalid parent_id (not created)
  const nonExistingParentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt category creation referencing that invalid parent_id, which must fail
  const categoryInput = {
    shopping_mall_ai_backend_channel_id: channel.id,
    parent_id: nonExistingParentId,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAiBackendChannelCategory.ICreate;
  await TestValidator.error(
    "category creation should fail with non-existent parent_id",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
        connection,
        {
          channelId: channel.id,
          body: categoryInput,
        },
      );
    },
  );
}
