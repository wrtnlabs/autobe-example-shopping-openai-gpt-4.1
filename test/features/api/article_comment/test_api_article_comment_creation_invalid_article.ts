import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_creation_invalid_article(
  connection: api.IConnection,
) {
  /**
   * Validates that creating a comment using a non-existent article ID fails
   * appropriately.
   *
   * Business context: Comments must be attached only to valid, existing
   * articles. The system must reject comments pointing to deleted/non-existing
   * articles, enforcing referential data integrity and preventing illegal
   * orphaned records.
   *
   * Steps:
   *
   * 1. Register a new customer, which sets up a valid session/authentication for
   *    the API.
   * 2. Generate a random UUID for an articleId which does not correspond to any
   *    real (existing) article.
   * 3. Attempt to create a comment for that non-existent article, providing all
   *    schema-required fields. (We set author_id for full compliance, although
   *    the request is expected to fail before ownership check is performed.)
   * 4. Assert that the API call fails with a business error (not found, forbidden,
   *    or similar), confirming that comment creation enforces article
   *    existence.
   */
  // 1. Register and authenticate as a customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "1234!Abcd",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Generate random UUID for non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare comment body targeting the non-existent article
  const createBody: IShoppingMallAiBackendArticleComment.ICreate = {
    article_id: nonExistentArticleId,
    author_id: customerJoin.customer.id,
    body: RandomGenerator.paragraph({ sentences: 5 }),
    is_secret: false,
  } satisfies IShoppingMallAiBackendArticleComment.ICreate;

  // 4. Assert error occurs when attempting to create comment for invalid article
  await TestValidator.error(
    "should not create comment for non-existent article",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
        connection,
        {
          articleId: nonExistentArticleId,
          body: createBody,
        },
      );
    },
  );
}
