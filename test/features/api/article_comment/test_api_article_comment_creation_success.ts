import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_creation_success(
  connection: api.IConnection,
) {
  /**
   * Test successful creation of an article comment by an authenticated
   * customer.
   *
   * 1. Register and authenticate a new customer
   * 2. Assume existence of an article (mock article id since there is no article
   *    creation or selection endpoint)
   * 3. Post a new comment as the authenticated customer on this article, as a root
   *    comment (parent_id null)
   * 4. Validate that the output comment fields match expectations and author is
   *    set to the authenticated customer
   *
   * Note: Since there is no comment list/read endpoint provided, only direct
   * output validation is possible.
   */

  // 1. Register and authenticate a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const customer = authorized.customer;
  const authorId = customer.id;

  // 2. Assume existence of an articleId (since article creation/fetch is unavailable)
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a new root comment for the article
  const commentInput: IShoppingMallAiBackendArticleComment.ICreate = {
    article_id: articleId,
    author_id: authorId,
    body: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Validate output fields
  TestValidator.equals(
    "comment article_id matches input",
    comment.article_id,
    articleId,
  );
  TestValidator.equals(
    "comment author_id matches customer",
    comment.author_id,
    authorId,
  );
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    commentInput.body,
  );
  TestValidator.equals(
    "comment is_secret matches input",
    comment.is_secret,
    commentInput.is_secret,
  );
  TestValidator.equals("comment parent_id is null", comment.parent_id, null);
  TestValidator.predicate(
    "comment id is non-empty uuid",
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate(
    "comment status is non-empty",
    typeof comment.status === "string" && comment.status.length > 0,
  );
  TestValidator.predicate(
    "comment created_at is non-empty",
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment updated_at is non-empty",
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );
  TestValidator.equals(
    "comment deleted_at is null or undefined",
    comment.deleted_at ?? null,
    null,
  );
}
