import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

export async function test_api_article_category_create_duplicate_name_failure(
  connection: api.IConnection,
) {
  /**
   * Checks the API's enforcement of unique category names per channel.
   *
   * Steps:
   *
   * 1. Register an admin account (establish admin privileges and token).
   * 2. Create an article category in a given channel with a random, unique name.
   * 3. Attempt to create a second category in the same channel with the same name
   *    (should fail per business rule).
   * 4. Assert that the API returns a uniqueness/validation error for the duplicate
   *    name.
   */

  // 1. Register a unique admin account
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminDetails = {
    username: adminUsername,
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hash for test
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminDetails,
  });
  typia.assert(adminAuth);

  // 2. Create the initial category in a fixed channel with a specific name
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const categoryName = RandomGenerator.name();
  const initialCategoryProps = {
    channel_id: channelId,
    name: categoryName,
    order: 1,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parent_id: null,
  } satisfies IShoppingMallAiBackendArticleCategory.ICreate;
  const initialCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      {
        body: initialCategoryProps,
      },
    );
  typia.assert(initialCategory);
  TestValidator.equals(
    "created category name matches input",
    initialCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "created category channel matches input",
    initialCategory.channel_id,
    channelId,
  );

  // 3. Attempt to create a duplicate-named category in the same channel (should trigger validation error)
  const duplicateCategoryProps = {
    channel_id: channelId,
    name: categoryName,
    order: 2, // deliberately different order
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
  } satisfies IShoppingMallAiBackendArticleCategory.ICreate;
  await TestValidator.error(
    "duplicate category name in same channel should cause error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
        connection,
        {
          body: duplicateCategoryProps,
        },
      );
    },
  );
}
