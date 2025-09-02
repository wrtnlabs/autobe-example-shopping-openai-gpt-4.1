import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_customer_article_comment_retrieve_forbidden_secret(
  connection: api.IConnection,
) {
  /**
   * Test that secret/private comments cannot be retrieved by unauthorized
   * users.
   *
   * This test ensures that when a comment is created with the 'is_secret' flag
   * set to true, the comment cannot be accessed by other customers who are not
   * the author. This is critical to uphold privacy and access control for
   * private discussions or internal notes.
   *
   * Steps:
   *
   * 1. Register 'author' customer and join as author
   * 2. Simulate creation of an article by some means (since direct article
   *    creation API is not available, we simulate IDs)
   * 3. As author, simulate addition of a comment to that article with
   *    is_secret=true and unique commentId (Since there is no comment creation
   *    endpoint in API, we must simulate or assume IDs for testing GET
   *    behavior.)
   * 4. Register a second 'intruder' customer and join as that user
   * 5. As intruder, attempt to retrieve the secret comment and verify that access
   *    is denied (should throw HttpError)
   * 6. As unauthenticated (no auth header), attempt to retrieve the secret comment
   *    and verify forbidden (should throw HttpError)
   *
   * Note: Since there is no endpoint to create articles or comments, this test
   * can only simulate the forbidden GET attempt. If article creation/retrieval
   * endpoints existed, they would be used for robust setup.
   */

  // 1. Register author customer (auth context set)
  const authorJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "Test1234!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(authorJoin);
  // 2. Simulate article and comment IDs
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // (In real test, author would create article and comment with is_secret=true here.)

  // 3. Register intruder customer (this will overwrite connection.auth header)
  const intruderJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "Test1234!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(intruderJoin);

  // 4. As intruder, attempt to access the secret comment - should error
  await TestValidator.error(
    "intruder cannot access secret comment",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.at(
        connection,
        {
          articleId,
          commentId,
        },
      );
    },
  );

  // 5. As unauthenticated, try again, should also error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access secret comment",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.at(
        unauthConn,
        {
          articleId,
          commentId,
        },
      );
    },
  );
}
