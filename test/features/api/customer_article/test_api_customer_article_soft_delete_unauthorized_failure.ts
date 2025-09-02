import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_article_soft_delete_unauthorized_failure(
  connection: api.IConnection,
) {
  /**
   * Test soft-delete denial for non-owner customer.
   *
   * Validates that a customer cannot soft-delete an article they do not own.
   *
   * Steps:
   *
   * 1. Register customer A (simulates article owner)
   * 2. (Cannot create article as A due to missing API; use random UUID as foreign
   *    articleId)
   * 3. Register customer B (auth state is now B)
   * 4. As B, attempt to soft-delete the articleId (should fail with authorization
   *    error)
   * 5. Confirm an error is thrown
   *
   * Note: Creation and ownership cannot be truly simulated since no article
   * creation API is provided. Thus, a random UUID is used to represent a
   * non-owned article.
   */

  // 1. Register customer A
  const customerA: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: "P@ssw0rd123",
        name: RandomGenerator.name(2),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerA);

  // 2. Simulate a foreign articleId with random UUID (cannot create via API)
  const alienArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Register customer B (context switches to B)
  const customerB: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: "P@ssw0rd123",
        name: RandomGenerator.name(2),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerB);

  // 4. As B, attempt to delete the article (should fail with forbidden/authorization error)
  await TestValidator.error(
    "non-owner customer cannot soft-delete article",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.erase(
        connection,
        {
          articleId: alienArticleId,
        },
      );
    },
  );
}
