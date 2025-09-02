import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_update_success_by_author(
  connection: api.IConnection,
) {
  /**
   * E2E validation: Author successfully updates their own article comment's
   * text and privacy status
   *
   * Scenario steps:
   *
   * 1. Register a new customer, obtain authentication context
   * 2. Prepare articleId (random, as article creation not in scope)
   * 3. Create a comment as that customer (author)
   * 4. Update the comment's body and is_secret flag as author
   * 5. Validate the returned comment reflects changes, author/created fields
   *    remain correct, audit trail (timestamps) is preserved
   */

  // 1. Register customer and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const phone_number = RandomGenerator.mobile();
  const password = typia.random<string & tags.Format<"password">>();
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name();
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;

  // 2. Prepare valid (random) articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a comment as this customer (author_id = customer.id)
  const createInput: IShoppingMallAiBackendArticleComment.ICreate = {
    article_id: articleId,
    author_id: customer.id,
    body: RandomGenerator.paragraph({ sentences: 7 }),
    is_secret: false,
  };
  const created =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
      connection,
      {
        articleId,
        body: createInput,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "comment author matches customer",
    created.author_id,
    customer.id,
  );
  TestValidator.equals(
    "comment associated with correct article",
    created.article_id,
    articleId,
  );
  TestValidator.equals(
    "comment body matches input",
    created.body,
    createInput.body,
  );
  TestValidator.equals("comment is not secret", created.is_secret, false);

  // 4. Update body and is_secret as author
  const updateInput: IShoppingMallAiBackendArticleComment.IUpdate = {
    body: RandomGenerator.paragraph({ sentences: 10 }),
    is_secret: true,
  };
  const updated =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.update(
      connection,
      {
        articleId,
        commentId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Verification: fields updated, author/created unchanged, audit trail maintained
  TestValidator.equals("updated body", updated.body, updateInput.body);
  TestValidator.equals(
    "is_secret flagged true after update",
    updated.is_secret,
    true,
  );
  TestValidator.equals(
    "author_id unchanged",
    updated.author_id,
    created.author_id,
  );
  TestValidator.equals(
    "article_id unchanged",
    updated.article_id,
    created.article_id,
  );
  TestValidator.equals("status unchanged", updated.status, created.status);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is after original",
    new Date(updated.updated_at).getTime() >
      new Date(created.updated_at).getTime(),
  );
}
