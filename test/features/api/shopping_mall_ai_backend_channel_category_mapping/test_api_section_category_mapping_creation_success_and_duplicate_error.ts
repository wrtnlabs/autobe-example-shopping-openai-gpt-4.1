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

export async function test_api_section_category_mapping_creation_success_and_duplicate_error(
  connection: api.IConnection,
) {
  /**
   * Validates the creation of section-category mappings and duplicate error
   * handling for shopping mall AI backend admin.
   *
   * Business context: Only admins can create mappings from navigation sections
   * to categories within a channel. The test ensures that a new mapping can be
   * created, duplicate mappings are rejected, and additional unique mappings
   * are accepted.
   *
   * Workflow:
   *
   * 1. Register and authenticate an admin (prerequisite)
   * 2. Create a channel
   * 3. Create a section under the channel
   * 4. Create two categories under the channel
   * 5. Create a mapping between the section and category1 (should succeed)
   * 6. Attempt to create a duplicate mapping for section and category1 (should
   *    fail)
   * 7. Create a mapping between section and category2 (should succeed)
   */

  // 1. Register and authenticate a new admin
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.test.com`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: adminEmail,
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
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create a section under the channel
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAiBackendChannelSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create two categories for the channel
  const category1 =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2 =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          order: 2,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(category2);

  // 5. Map section to first category (success test)
  const mapping1 =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.create(
      connection,
      {
        sectionId: section.id,
        body: {
          shopping_mall_ai_backend_channel_section_id: section.id,
          shopping_mall_ai_backend_channel_category_id: category1.id,
        } satisfies IShoppingMallAiBackendChannelCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping1);
  TestValidator.equals(
    "section id in mapping1 matches",
    mapping1.shopping_mall_ai_backend_channel_section_id,
    section.id,
  );
  TestValidator.equals(
    "category id in mapping1 matches",
    mapping1.shopping_mall_ai_backend_channel_category_id,
    category1.id,
  );

  // 6. Attempt duplicate mapping (error test)
  await TestValidator.error(
    "Duplicate mapping from section to same category rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.create(
        connection,
        {
          sectionId: section.id,
          body: {
            shopping_mall_ai_backend_channel_section_id: section.id,
            shopping_mall_ai_backend_channel_category_id: category1.id,
          } satisfies IShoppingMallAiBackendChannelCategoryMapping.ICreate,
        },
      );
    },
  );

  // 7. Map section to second category (success test)
  const mapping2 =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.create(
      connection,
      {
        sectionId: section.id,
        body: {
          shopping_mall_ai_backend_channel_section_id: section.id,
          shopping_mall_ai_backend_channel_category_id: category2.id,
        } satisfies IShoppingMallAiBackendChannelCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping2);
  TestValidator.equals(
    "section id in mapping2 matches",
    mapping2.shopping_mall_ai_backend_channel_section_id,
    section.id,
  );
  TestValidator.equals(
    "category id in mapping2 matches",
    mapping2.shopping_mall_ai_backend_channel_category_id,
    category2.id,
  );
}
