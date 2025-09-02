import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_delete_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Ensure that deleting an article comment fails if attempted by a user who is
   * not the author.
   *
   * Test process:
   *
   * 1. Register customer A and authenticate (author of comment)
   * 2. Customer A creates a comment on a random article
   * 3. Register customer B (switches API auth context to B)
   * 4. Attempt to delete A's comment as B, expecting a forbidden/authorization
   *    error
   */

  // 1. Register customer A (comment author)
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerA);

  // 2. Create a comment on a random article as customer A
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentCreate: IShoppingMallAiBackendArticleComment.ICreate = {
    article_id: articleId,
    author_id: customerA.customer.id,
    body: RandomGenerator.paragraph({ sentences: 3 }),
    is_secret: false,
  };
  const comment =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
      connection,
      {
        articleId,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // 3. Register customer B (this sets authentication context to B)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerB);

  // 4. Try to delete the comment as customer B (should fail)
  await TestValidator.error(
    "deleting an article comment by a non-author should be forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.erase(
        connection,
        {
          articleId,
          commentId: comment.id,
        },
      );
    },
  );
}
