import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_delete_already_deleted(
  connection: api.IConnection,
) {
  /**
   * Test soft deletion of a comment that has already been deleted.
   *
   * This function verifies that deleting a comment twice does not result in an
   * unexpected error, and that the API's deletion operation is idempotent. It
   * performs the following steps:
   *
   * 1. Register and authenticate a user to act as the comment author (using
   *    /auth/customer/join).
   * 2. Simulate an existing article by generating a random UUID for articleId.
   * 3. Create a new comment on the article, explicitly setting the author to the
   *    registered user.
   * 4. Perform the first DELETE operation on the comment; this should succeed
   *    (soft delete).
   * 5. Immediately perform the DELETE operation again on the same comment; it
   *    should succeed again (idempotency).
   *
   * Assumptions:
   *
   * - No article creation or lookup API is available, so a random articleId is
   *   used for simulation.
   * - The customer must be registered and authenticated prior to comment actions.
   * - Only supported API endpoints and DTOs are used (no synthetic types).
   *
   * This verifies that repeated deletion of a soft-deletable resource is safe
   * and does not produce unhandled errors.
   */
  // 1. Register and authenticate a user as comment author.
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResp: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(joinResp);

  // 2. Simulate an existing articleId (as no creation API is present).
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a new comment on the article. Use the registered user's id as author_id.
  const commentInput: IShoppingMallAiBackendArticleComment.ICreate = {
    article_id: articleId,
    author_id: joinResp.customer.id,
    body: RandomGenerator.paragraph({ sentences: 8 }),
    is_secret: false,
  };
  const comment =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
      connection,
      {
        articleId,
        body: commentInput,
      },
    );
  typia.assert(comment);

  // 4. Perform first soft delete of the comment
  await api.functional.shoppingMallAiBackend.customer.articles.comments.erase(
    connection,
    {
      articleId,
      commentId: comment.id,
    },
  );

  // 5. Perform second soft delete (should be idempotent; no error expected)
  await api.functional.shoppingMallAiBackend.customer.articles.comments.erase(
    connection,
    {
      articleId,
      commentId: comment.id,
    },
  );
}
