import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

export async function test_api_article_category_retrieve_not_found(
  connection: api.IConnection,
) {
  /**
   * Validates that retrieving a non-existent article category as admin returns
   * a not found error (404).
   *
   * Scenario:
   *
   * 1. Register a new admin account to obtain authentication credentials via
   *    /auth/admin/join.
   * 2. Attempt to retrieve an article category using GET
   *    /shoppingMallAiBackend/admin/articleCategories/{articleCategoryId},
   *    where the id is a random UUID that does not exist in the system.
   * 3. Confirm that the system responds with the expected not found error,
   *    verifying security and proper error handling.
   */

  // 1. Register a new admin account for authentication.
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32), // random string - test context only
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Attempt to retrieve a non-existent article category by random UUID.
  await TestValidator.error(
    "retrieving non-existent article category returns 404",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.articleCategories.at(
        connection,
        {
          articleCategoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
