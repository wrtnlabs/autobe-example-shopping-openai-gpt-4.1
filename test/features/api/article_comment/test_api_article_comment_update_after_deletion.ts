import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

/**
 * Validate that updating a comment after soft deletion is forbidden.
 *
 * This test covers enforcement of resource deletion semantics. After a
 * customer registers and creates a comment, the comment is soft-deleted. An
 * attempt is then made to update (edit body/is_secret) the same comment.
 * The API must return an error (such as not found/forbidden) because the
 * comment has been deleted, and logical updates are thereby forbidden.
 *
 * Steps:
 *
 * 1. Register and authenticate a customer
 * 2. Create a comment (using a random articleId for association)
 * 3. Soft delete the comment
 * 4. Attempt to update the deleted comment; verify that this fails with proper
 *    API error
 */
export async function test_api_article_comment_update_after_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate customer
  const email = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.customer.id;

  // 2. Create a comment for a random articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentCreate =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
      connection,
      {
        articleId,
        body: {
          article_id: articleId,
          parent_id: null,
          author_id: customerId,
          body: RandomGenerator.paragraph({ sentences: 4 }),
          is_secret: false,
        } satisfies IShoppingMallAiBackendArticleComment.ICreate,
      },
    );
  typia.assert(commentCreate);
  const commentId = commentCreate.id;

  // 3. Soft delete the comment
  await api.functional.shoppingMallAiBackend.customer.articles.comments.erase(
    connection,
    {
      articleId,
      commentId,
    },
  );

  // 4. Attempt to update the deleted comment and expect an error
  await TestValidator.error(
    "updating a deleted comment must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.update(
        connection,
        {
          articleId,
          commentId,
          body: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
            is_secret: true,
          } satisfies IShoppingMallAiBackendArticleComment.IUpdate,
        },
      );
    },
  );
}
