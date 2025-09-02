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
import type { IPageIShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelCategoryMapping";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_section_category_mapping_list_success_and_edge_cases(
  connection: api.IConnection,
) {
  /**
   * Test: Retrieve and validate paginated and filtered listing of
   * section-category mappings as admin.
   *
   * This validates that an admin can:
   *
   * 1. Register and authenticate.
   * 2. Create a channel, section, and categories.
   * 3. Map each category to the section, then paginate and filter mappings.
   * 4. Validate correct results for default, paginated, and category-filtered
   *    queries.
   * 5. Validate behavior with no mappings and invalid sectionId.
   *
   * Steps:
   *
   * 1. Register admin and check authentication context.
   * 2. Create channel entity and verify creation.
   * 3. Create a section within channel and verify.
   * 4. Create N categories and verify.
   * 5. Map each category to the section (N mappings).
   * 6. List all mappings, validate total count.
   * 7. List with pagination (limit & page), check correctness.
   * 8. List filtered by category, check filter logic.
   * 9. List for new section with no mappings, expect 0.
   * 10. Query invalid section, expect error.
   */

  // 1. Admin registration & authentication
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@enterprise.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin registration assigns username",
    admin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin registration assigns email",
    admin.admin.email,
    adminEmail,
  );

  // 2. Create channel
  const channelInput: IShoppingMallAiBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  };
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);
  TestValidator.equals(
    "channel creation sets code",
    channel.code,
    channelInput.code,
  );

  // 3. Create section within channel
  const sectionInput: IShoppingMallAiBackendChannelSection.ICreate = {
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
    order: 1,
  };
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);
  TestValidator.equals(
    "section creation sets name",
    section.name,
    sectionInput.name,
  );

  // 4. Create test categories (enough for pagination)
  const categories = await ArrayUtil.asyncRepeat(12, async (i) => {
    const catInput: IShoppingMallAiBackendChannelCategory.ICreate = {
      shopping_mall_ai_backend_channel_id: channel.id,
      parent_id: null,
      code: `${RandomGenerator.alphaNumeric(5)}${i}`,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      order: i + 1,
    };
    const cat =
      await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
        connection,
        {
          channelId: channel.id,
          body: catInput,
        },
      );
    typia.assert(cat);
    TestValidator.equals(
      `category ${i + 1} creation sets code`,
      cat.code,
      catInput.code,
    );
    return cat;
  });

  // 5. Map each category to the section
  const mappings = await ArrayUtil.asyncMap(categories, async (cat, idx) => {
    const mapping =
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.create(
        connection,
        {
          sectionId: section.id,
          body: {
            shopping_mall_ai_backend_channel_section_id: section.id,
            shopping_mall_ai_backend_channel_category_id: cat.id,
          } satisfies IShoppingMallAiBackendChannelCategoryMapping.ICreate,
        },
      );
    typia.assert(mapping);
    TestValidator.equals(
      `mapping ${idx + 1} section id`,
      mapping.shopping_mall_ai_backend_channel_section_id,
      section.id,
    );
    TestValidator.equals(
      `mapping ${idx + 1} category id`,
      mapping.shopping_mall_ai_backend_channel_category_id,
      cat.id,
    );
    return mapping;
  });
  // All mapped section ids must match main section
  TestValidator.predicate(
    "all mappings are for section",
    mappings.every(
      (m) => m.shopping_mall_ai_backend_channel_section_id === section.id,
    ),
  );

  // 6. List all mappings for the section
  const listAll =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.index(
      connection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(listAll);
  TestValidator.equals(
    "total mapping records",
    listAll.pagination.records,
    mappings.length,
  );
  TestValidator.equals(
    "list contains all mappings count",
    listAll.data.length,
    mappings.length,
  );
  TestValidator.predicate(
    "list section ids are correct",
    listAll.data.every(
      (mp) => mp.shopping_mall_ai_backend_channel_section_id === section.id,
    ),
  );

  // 7. List with pagination (limit 5, page 2)
  const paged =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.index(
      connection,
      {
        sectionId: section.id,
        body: { page: 2, limit: 5 },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination limit applied", paged.pagination.limit, 5);
  TestValidator.equals("pagination current page", paged.pagination.current, 2);
  TestValidator.predicate("paged results <= limit", paged.data.length <= 5);

  // 8. List mappings with filter_category_id (should only show one mapping)
  const oneCat = RandomGenerator.pick(categories);
  const filtered =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.index(
      connection,
      {
        sectionId: section.id,
        body: { filter_category_id: oneCat.id },
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtered mapping count",
    filtered.data.length,
    filtered.pagination.records,
  );
  // All returned must match filter
  TestValidator.predicate(
    "filtered list: every mapping matches category",
    filtered.data.every(
      (d) => d.shopping_mall_ai_backend_channel_category_id === oneCat.id,
    ),
  );
  // If present, confirm section id matches too
  TestValidator.predicate(
    "filtered list: every mapping section matches",
    filtered.data.every(
      (d) => d.shopping_mall_ai_backend_channel_section_id === section.id,
    ),
  );

  // 9. List mappings for new empty section
  const emptySectionInput: IShoppingMallAiBackendChannelSection.ICreate = {
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
    order: 2,
  };
  const emptySection =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: emptySectionInput,
      },
    );
  typia.assert(emptySection);
  const emptyMapping =
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.index(
      connection,
      {
        sectionId: emptySection.id,
        body: {},
      },
    );
  typia.assert(emptyMapping);
  TestValidator.equals(
    "empty section no mappings",
    emptyMapping.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty section data.length==0",
    emptyMapping.data.length,
    0,
  );

  // 10. Invalid sectionId (should error)
  await TestValidator.error("invalid sectionId throws", async () => {
    await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.index(
      connection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}
