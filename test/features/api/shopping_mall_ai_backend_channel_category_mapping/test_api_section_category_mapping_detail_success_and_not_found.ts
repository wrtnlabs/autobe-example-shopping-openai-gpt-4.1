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

/**
 * E2E test: Retrieve detail for admin section-category mapping (success +
 * not found)
 *
 * Validates the admin endpoint for fetching a section-category mapping's
 * details by mappingId and sectionId. Covers both the happy path
 * (successful retrieval of just-created mapping) and negative cases (404
 * for not found mappingId and sectionId).
 *
 * Steps:
 *
 * 1. Register and authenticate an admin to enable protected endpoint access.
 * 2. Create a channel (parent level for section/category).
 * 3. Under the channel, create a section (to be mapped).
 * 4. Under the channel, create a category (to be linked to the section).
 * 5. Create mapping between the new section and category to obtain mappingId.
 * 6. Retrieve mapping details with the known sectionId and mappingId; validate
 *    all returned relationships.
 * 7. Attempt retrieval with a non-existent mappingId (should 404).
 * 8. Attempt retrieval with a non-existent sectionId but valid mappingId
 *    (should 404).
 *
 * This ensures both positive and negative boundary handling for correct,
 * robust API behavior.
 */
export async function test_api_section_category_mapping_detail_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@autobe-e2e.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create a channel
  const channelInput: IShoppingMallAiBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    country: "KR",
    currency: "KRW",
    language: "ko-KR",
    timezone: "Asia/Seoul",
  };
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 3. Create a section under the channel
  const sectionInput: IShoppingMallAiBackendChannelSection.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    order: 0,
  };
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionInput },
    );
  typia.assert(section);

  // 4. Create a category under the channel
  const categoryInput: IShoppingMallAiBackendChannelCategory.ICreate = {
    shopping_mall_ai_backend_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    order: 0,
  };
  const category =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      { channelId: channel.id, body: categoryInput },
    );
  typia.assert(category);

  // 5. Map the section to the category
  const mappingInput: IShoppingMallAiBackendChannelCategoryMapping.ICreate = {
    shopping_mall_ai_backend_channel_section_id: section.id,
    shopping_mall_ai_backend_channel_category_id: category.id,
  };
  const mapping =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.create(
      connection,
      { sectionId: section.id, body: mappingInput },
    );
  typia.assert(mapping);
  TestValidator.equals(
    "mapping: section linkage correct",
    mapping.shopping_mall_ai_backend_channel_section_id,
    section.id,
  );
  TestValidator.equals(
    "mapping: category linkage correct",
    mapping.shopping_mall_ai_backend_channel_category_id,
    category.id,
  );

  // 6. Retrieve mapping details by valid sectionId and mappingId
  const retrieved =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.at(
      connection,
      {
        sectionId: section.id,
        mappingId: mapping.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved mapping id matches",
    retrieved.id,
    mapping.id,
  );
  TestValidator.equals(
    "retrieved: section linkage",
    retrieved.shopping_mall_ai_backend_channel_section_id,
    section.id,
  );
  TestValidator.equals(
    "retrieved: category linkage",
    retrieved.shopping_mall_ai_backend_channel_category_id,
    category.id,
  );

  // 7. Negative: Not found by random mappingId
  await TestValidator.error(
    "not found by random mappingId triggers error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.at(
        connection,
        {
          sectionId: section.id,
          mappingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Negative: Not found by random sectionId and valid mappingId
  await TestValidator.error(
    "not found by random sectionId triggers error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.at(
        connection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          mappingId: mapping.id,
        },
      );
    },
  );
}
