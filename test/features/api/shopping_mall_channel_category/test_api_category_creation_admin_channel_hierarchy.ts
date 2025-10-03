import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test the creation of hierarchical categories within a shopping mall channel
 * by an admin.
 *
 * 1. Register an admin and create a shopping mall channel.
 * 2. Admin creates a root category (no parent_id) with all required fields and
 *    optional description.
 * 3. Admin creates a subcategory under the root category (parent_id set), with and
 *    without description.
 * 4. Attempt to create another category in same channel with duplicate code or
 *    duplicate name—expect errors.
 * 5. Attempt to create a category with non-existent parent_id—expect error.
 * 6. Attempt to create a category as unauthenticated/no-admin—expect error.
 * 7. For all created categories, assert correct association to parent/channel,
 *    audit fields present, and required fields enforced.
 */
export async function test_api_category_creation_admin_channel_hierarchy(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  // 2. Channel creation
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 3. Root category (with description)
  const rootCategoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 0,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const rootCategory: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: rootCategoryBody,
      },
    );
  typia.assert(rootCategory);
  TestValidator.equals(
    "root category channel association",
    rootCategory.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "root category parent_id is null",
    rootCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "root category description matches",
    rootCategory.description,
    rootCategoryBody.description,
  );
  TestValidator.equals(
    "root category display order",
    rootCategory.display_order,
    rootCategoryBody.display_order,
  );
  TestValidator.predicate(
    "root category created_at present",
    typeof rootCategory.created_at === "string" &&
      rootCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "root category updated_at present",
    typeof rootCategory.updated_at === "string" &&
      rootCategory.updated_at.length > 0,
  );

  // 4. Subcategory (with description)
  const subCategoryBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: rootCategory.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const subCategory: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: subCategoryBody,
      },
    );
  typia.assert(subCategory);
  TestValidator.equals(
    "subcat channel association",
    subCategory.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "subcat parent_id",
    subCategory.parent_id,
    rootCategory.id,
  );
  TestValidator.equals("subcat name", subCategory.name, subCategoryBody.name);
  TestValidator.equals(
    "subcat description",
    subCategory.description,
    subCategoryBody.description,
  );
  TestValidator.equals(
    "subcat display order",
    subCategory.display_order,
    subCategoryBody.display_order,
  );

  // 5. Create subcategory without description
  const subCategoryNoDescBody = {
    shopping_mall_channel_id: channel.id,
    parent_id: rootCategory.id,
    code: RandomGenerator.alphaNumeric(9),
    name: RandomGenerator.name(),
    display_order: 2,
  } satisfies IShoppingMallChannelCategory.ICreate;
  const subCategoryNoDesc: IShoppingMallChannelCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: subCategoryNoDescBody,
      },
    );
  typia.assert(subCategoryNoDesc);
  TestValidator.equals(
    "subcat no desc description is null or undefined",
    subCategoryNoDesc.description,
    undefined,
  );

  // 6. Attempt duplicate code root category (expect error)
  await TestValidator.error("duplicate code error", async () => {
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ...rootCategoryBody,
          name: RandomGenerator.name(),
          code: rootCategoryBody.code, // duplicate code
        },
      },
    );
  });
  // 7. Attempt duplicate name (expect error)
  await TestValidator.error("duplicate name error", async () => {
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ...rootCategoryBody,
          name: rootCategoryBody.name, // duplicate name
          code: RandomGenerator.alphaNumeric(13),
        },
      },
    );
  });
  // 8. Non-existent parent_id
  await TestValidator.error("invalid parent_id error", async () => {
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ...rootCategoryBody,
          parent_id: typia.random<string & tags.Format<"uuid">>(), // random not created parent_id
          code: RandomGenerator.alphaNumeric(13),
          name: RandomGenerator.name(),
        },
      },
    );
  });
  // 9. Unauthenticated: Try to create with fresh connection (no admin)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized category creation error",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.create(
        unauthConn,
        {
          channelId: channel.id,
          body: {
            ...rootCategoryBody,
            code: RandomGenerator.alphaNumeric(15),
            name: RandomGenerator.name(),
          },
        },
      );
    },
  );
}
