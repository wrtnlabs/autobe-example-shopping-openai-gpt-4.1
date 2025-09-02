import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

/**
 * Test successful retrieval of an article category by admin.
 *
 * This test verifies that an admin can retrieve information of an article
 * category right after creation. The flow is:
 *
 * 1. Register a new admin via /auth/admin/join, establishing the necessary
 *    authentication context.
 * 2. Create a new article category using POST
 *    /shoppingMallAiBackend/admin/articleCategories, to ensure a valid
 *    articleCategoryId and known data.
 * 3. Retrieve this article category using GET
 *    /shoppingMallAiBackend/admin/articleCategories/{articleCategoryId}.
 * 4. Confirm that the returned object is type-valid and that all fields match
 *    what was created.
 *
 * The API should return the full article category object, and all
 * properties should match exactly with the data as created (including name,
 * channel_id, order, parent_id/description if set,
 * created_at/updated_at/deleted_at, etc.).
 */
export async function test_api_article_category_retrieve_success_admin_role(
  connection: api.IConnection,
) {
  // 1. Register a new admin account; this sets the authentication context for subsequent admin actions.
  const adminUsername = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(20), // Not real password - API expects hash
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);
  typia.assert(admin.admin);

  // 2. Create a new article category
  const articleCategoryProps: IShoppingMallAiBackendArticleCategory.ICreate = {
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 2,
      wordMax: 6,
    }),
    order: 1,
  };
  const created: IShoppingMallAiBackendArticleCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      {
        body: articleCategoryProps,
      },
    );
  typia.assert(created);

  // 3. Retrieve the article category by ID
  const read: IShoppingMallAiBackendArticleCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.at(
      connection,
      {
        articleCategoryId: created.id,
      },
    );
  typia.assert(read);

  // 4. Assert all fields match (except timestamps/id, which are output by server)
  TestValidator.equals(
    "article category name matches",
    read.name,
    articleCategoryProps.name,
  );
  TestValidator.equals(
    "article category description matches",
    read.description,
    articleCategoryProps.description,
  );
  TestValidator.equals(
    "article category channel_id matches",
    read.channel_id,
    articleCategoryProps.channel_id,
  );
  TestValidator.equals(
    "article category order matches",
    read.order,
    articleCategoryProps.order,
  );
  TestValidator.equals(
    "article category parent_id matches",
    read.parent_id,
    articleCategoryProps.parent_id ?? null,
  );

  // created_at/updated_at/deleted_at: just check presence and date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof read.created_at === "string" &&
      !!read.created_at &&
      !Number.isNaN(Date.parse(read.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof read.updated_at === "string" &&
      !!read.updated_at &&
      !Number.isNaN(Date.parse(read.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null after creation",
    read.deleted_at,
    null,
  );
}
