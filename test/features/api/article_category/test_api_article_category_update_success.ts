import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

export async function test_api_article_category_update_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful update of an article category by an admin.
   *
   * Test workflow:
   *
   * 1. Register a new admin via /auth/admin/join so that we have management
   *    permission.
   * 2. Create a new article category as a prerequisite for updating.
   * 3. Update the created article category's name, description, and parent_id
   *    using valid values via PUT.
   * 4. Validate the response reflects all the updated values.
   */
  // 1. Register/admin join
  const adminJoinData: IShoppingMallAiBackendAdmin.ICreate = {
    username:
      RandomGenerator.name().replace(/\s/g, "").toLowerCase() +
      RandomGenerator.alphaNumeric(4),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(12)}@malladmin.com` as string &
      tags.Format<"email">,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinData,
  });
  typia.assert(adminAuth);

  // 2. Create an article category (under random channel)
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const categoryCreate: IShoppingMallAiBackendArticleCategory.ICreate = {
    channel_id: channelId,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
    parent_id: null,
  };
  const createdCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryCreate.name,
  );
  TestValidator.equals(
    "created category channel matches input",
    createdCategory.channel_id,
    channelId,
  );

  // 3. Update category with new values: name, description, order, and (optionally) new parent
  const updateBody: IShoppingMallAiBackendArticleCategory.IUpdate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 2,
    parent_id: null,
  };
  const updatedCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.update(
      connection,
      {
        articleCategoryId: createdCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  TestValidator.equals(
    "updated category name",
    updatedCategory.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated category description",
    updatedCategory.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated category order",
    updatedCategory.order,
    updateBody.order,
  );
  TestValidator.equals(
    "updated category parent",
    updatedCategory.parent_id,
    updateBody.parent_id,
  );
  // non-updated fields remain the same
  TestValidator.equals(
    "updated category channel unchanged",
    updatedCategory.channel_id,
    createdCategory.channel_id,
  );
}
