import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

export async function test_api_article_category_update_name_conflict(
  connection: api.IConnection,
) {
  /**
   * Test that updating an article category's name to a duplicate in the same
   * channel fails.
   *
   * Steps:
   *
   * 1. Register an admin user and authenticate
   * 2. Create a unique channel id for the test
   * 3. Create category1 with a unique name in the channel
   * 4. Create category2 with a different unique name in the same channel
   * 5. Attempt to update category2's name to match category1
   * 6. Verify the API rejects the operation (uniqueness constraint enforced)
   */

  // Step 1. Register an admin user and authenticate
  const adminUsername: string = RandomGenerator.alphaNumeric(8);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(6)}@test-company.com`;
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
        phone_number: null,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2. Create a unique channel id for the test
  const channel_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3. Create category1 with a unique name in the channel
  const categoryName1: string = RandomGenerator.name(2);
  const category1: IShoppingMallAiBackendArticleCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      {
        body: {
          channel_id,
          name: categoryName1,
          order: 1,
          description: null,
          parent_id: null,
        } satisfies IShoppingMallAiBackendArticleCategory.ICreate,
      },
    );
  typia.assert(category1);

  // Step 4. Create category2 with a different unique name in the same channel
  let categoryName2: string;
  do {
    categoryName2 = RandomGenerator.name(2);
  } while (categoryName2 === categoryName1);
  const category2: IShoppingMallAiBackendArticleCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      {
        body: {
          channel_id,
          name: categoryName2,
          order: 2,
          description: null,
          parent_id: null,
        } satisfies IShoppingMallAiBackendArticleCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Step 5. Attempt to update category2's name to match category1
  await TestValidator.error(
    "updating article category to a duplicate name should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.articleCategories.update(
        connection,
        {
          articleCategoryId: category2.id,
          body: {
            name: categoryName1,
          } satisfies IShoppingMallAiBackendArticleCategory.IUpdate,
        },
      );
    },
  );
}
