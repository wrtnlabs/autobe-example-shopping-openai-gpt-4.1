import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import type { IShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategoryMapping";

export async function test_api_section_category_mapping_update_success_and_validation_checks(
  connection: api.IConnection,
) {
  /**
   * Validates update operation and error scenarios for section-category mapping
   * by admin.
   *
   * 1. Register admin for authentication.
   * 2. Create a channel.
   * 3. Create one section under the channel.
   * 4. Create two categories under the channel.
   * 5. Create an initial mapping of section to first category.
   * 6. Update mapping to second category. Verify update is successful.
   * 7. Attempt update to use a non-existent category UUID; verify not found /
   *    validation error.
   * 8. Attempt update to use invalid payload (e.g., blank body); verify validation
   *    error.
   * 9. Re-verify the mapping is still on the second (legit) category after errors
   *    (via a no-op update and checking result).
   */

  // Step 1: Register admin
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminJoin);

  // Step 2: Create channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // Step 3: Create section under channel
  const sectionInput = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
    order: 1,
  } satisfies IShoppingMallAiBackendChannelSection.ICreate;
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionInput },
    );
  typia.assert(section);

  // Step 4: Create two categories
  const category1Input = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parent_id: null,
    order: 1,
  } satisfies IShoppingMallAiBackendChannelCategory.ICreate;
  const category1 =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: category1Input },
    );
  typia.assert(category1);

  const category2Input = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parent_id: null,
    order: 2,
  } satisfies IShoppingMallAiBackendChannelCategory.ICreate;
  const category2 =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: category2Input },
    );
  typia.assert(category2);

  // Step 5: Create initial mapping for section and first category
  const mappingInput = {
    shopping_mall_ai_backend_channel_section_id: section.id,
    shopping_mall_ai_backend_channel_category_id: category1.id,
  } satisfies IShoppingMallAiBackendChannelCategoryMapping.ICreate;
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.create(
      connection,
      { sectionId: section.id, body: mappingInput },
    );
  typia.assert(mapping);

  // Step 6: Update mapping to second category
  const updateInput = {
    shopping_mall_ai_backend_channel_category_id: category2.id,
  } satisfies IShoppingMallAiBackendChannelCategoryMapping.IUpdate;
  const updated =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.update(
      connection,
      { sectionId: section.id, mappingId: mapping.id, body: updateInput },
    );
  typia.assert(updated);
  TestValidator.equals(
    "mapping updated to second category",
    updated.shopping_mall_ai_backend_channel_category_id,
    category2.id,
  );

  // Step 7: Attempt to update using a non-existent category; expect error
  await TestValidator.error(
    "update with non-existent category should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.update(
        connection,
        {
          sectionId: section.id,
          mappingId: mapping.id,
          body: {
            shopping_mall_ai_backend_channel_category_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IShoppingMallAiBackendChannelCategoryMapping.IUpdate,
        },
      );
    },
  );

  // Step 8: Attempt to update with invalid/empty payload; expect validation error
  await TestValidator.error(
    "update with invalid payload should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.update(
        connection,
        {
          sectionId: section.id,
          mappingId: mapping.id,
          body: {}, // purposely breaking validation; should trigger error
        },
      );
    },
  );

  // Step 9: Re-verify mapping is still targeting category2. Here, we perform a no-op update (empty body) and confirm the mapping's category is unchanged.
  const final =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.update(
      connection,
      { sectionId: section.id, mappingId: mapping.id, body: {} },
    );
  typia.assert(final);
  TestValidator.equals(
    "mapping remains targeting category2 after errors",
    final.shopping_mall_ai_backend_channel_category_id,
    category2.id,
  );
}
