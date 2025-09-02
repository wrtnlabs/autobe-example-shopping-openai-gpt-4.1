import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_update_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Test that updating a comment fails if it's attempted by a user who is not
   * the original author.
   *
   * 1. Register customer A. (This sets session to A.)
   * 2. As customer A, create a comment for a random article ID (simulate article
   *    existence).
   * 3. Register customer B. (Session switches to B, now acting as B.)
   * 4. As customer B, attempt to update A's comment.
   * 5. Assert that this update is forbidden or unauthorized.
   */

  // 1. Register customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        phone_number: RandomGenerator.mobile(),
        password: "Password123!",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerA);

  // 2. As customer A, create a comment on a random article
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({ sentences: 2 });
  const comment: IShoppingMallAiBackendArticleComment =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
      connection,
      {
        articleId,
        body: {
          article_id: articleId,
          author_id: customerA.customer.id,
          body: commentBody,
          is_secret: false,
        } satisfies IShoppingMallAiBackendArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Register customer B (join switches session)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        phone_number: RandomGenerator.mobile(),
        password: "Password321!",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerB);

  // 4. As customer B, attempt to update A's comment
  await TestValidator.error(
    "non-author cannot update another user's comment",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.update(
        connection,
        {
          articleId: comment.article_id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallAiBackendArticleComment.IUpdate,
        },
      );
    },
  );
}
