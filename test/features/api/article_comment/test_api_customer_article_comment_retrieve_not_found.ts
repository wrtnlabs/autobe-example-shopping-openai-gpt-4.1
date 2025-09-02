import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_customer_article_comment_retrieve_not_found(
  connection: api.IConnection,
) {
  /**
   * Negative test for retrieving a non-existent comment of a non-existent
   * article.
   *
   * This scenario ensures that the endpoint
   * /shoppingMallAiBackend/customer/articles/{articleId}/comments/{commentId}
   * properly returns a not found error (such as HTTP 404) when called with
   * UUIDs that are guaranteed not to reference any existing article or comment.
   * This test simulates a fully authorized customer (by registering a new
   * account) and then attempts to retrieve a comment using randomly generated
   * UUIDs for both articleId and commentId, which should never exist in the
   * current system.
   *
   * Steps:
   *
   * 1. Register a new customer account to establish authentication context.
   * 2. Attempt to retrieve a comment using random UUIDs for articleId and
   *    commentId.
   * 3. Assert that the endpoint throws a not found error.
   */

  // 1. Register and authenticate as a customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const auth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(auth);

  // 2. Attempt to read a non-existent comment for a non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return not found for non-existent comment and article",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.at(
        connection,
        {
          articleId: nonExistentArticleId,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
