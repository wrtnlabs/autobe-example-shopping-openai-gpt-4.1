import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

/**
 * E2E: Verify soft deletion (by author customer) of a comment on an
 * article.
 *
 * This test ensures that a customer can register, create a comment on an
 * article, and then delete that comment. It confirms that the soft deletion
 * operation completes without errors and that the created comment is
 * associated with the correct author. Due to API limitations (no comment
 * listing or fetch-by-id endpoint), it is **not possible** to verify audit
 * evidence (e.g., deleted_at) or comment exclusion from standard listings
 * post-deletion. If/when comment list/retrieve endpoints become available,
 * the test should be expanded to check deleted_at and exclusion.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a customer (author)
 * 2. Generate a random article ID (API does not provide article creation)
 * 3. Customer creates a comment on the article
 * 4. Customer deletes (soft deletes) the comment
 * 5. Confirm author_id links comment to customer (pre-deletion only)
 *
 * No validation of comment post-deletion is possible given current API.
 */
export async function test_api_article_comment_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer (author)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const registerResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(registerResult);

  // 2. Create an article id for the comment (simulate / use a random UUID, since no article creation API is available)
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a comment on the article as the customer
  const commentCreateInput: IShoppingMallAiBackendArticleComment.ICreate = {
    article_id: articleId,
    // parent_id is omitted (root comment)
    author_id: registerResult.customer.id,
    body: RandomGenerator.paragraph({ sentences: 2 }),
    is_secret: false,
  };
  const comment =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
      connection,
      {
        articleId,
        body: commentCreateInput,
      },
    );
  typia.assert(comment);

  // 4. Soft delete the comment as its author
  await api.functional.shoppingMallAiBackend.customer.articles.comments.erase(
    connection,
    {
      articleId: articleId,
      commentId: comment.id,
    },
  );

  // 5. Confirm via pre-deletion check (no post-deletion checks possible)
  TestValidator.equals(
    "author of created comment matches customer id",
    comment.author_id,
    registerResult.customer.id,
  );
  // Note: Cannot fetch comment or validate deleted_at after deletion (no suitable API). No exclusion/listing validation possible.
}
