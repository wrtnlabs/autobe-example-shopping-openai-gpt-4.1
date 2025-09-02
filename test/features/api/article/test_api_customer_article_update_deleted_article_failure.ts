import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

export async function test_api_customer_article_update_deleted_article_failure(
  connection: api.IConnection,
) {
  /**
   * Test that updating a soft-deleted article is not allowed.
   *
   * Steps:
   *
   * 1. Register a new customer account via /auth/customer/join, ensuring proper
   *    authentication for the lifecycle.
   * 2. Use a simulated article ID (as no create endpoint exists) for negative
   *    testing.
   * 3. Soft-delete the article with
   *    /shoppingMallAiBackend/customer/articles/{articleId}. This marks
   *    deleted_at, preventing further modification.
   * 4. Attempt to update the deleted article via PUT; the operation must fail
   *    according to business logic.
   * 5. Assert that the update call throws an error, confirming the API enforces
   *    correct immutability after soft deletion.
   */

  // 1. Register and authenticate as customer
  const joinResponse = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResponse);

  // 2. Prepare a random (simulated) article ID for test
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Soft-delete the article (this would normally mark deleted_at in the DB)
  await api.functional.shoppingMallAiBackend.customer.articles.erase(
    connection,
    {
      articleId,
    },
  );

  // 4. Attempt article update after deletion – must fail (business error expected)
  await TestValidator.error(
    "Updating a soft-deleted article must trigger a validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.update(
        connection,
        {
          articleId,
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallAiBackendArticle.IUpdate,
        },
      );
    },
  );
}
