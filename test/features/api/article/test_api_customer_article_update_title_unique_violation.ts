import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

export async function test_api_customer_article_update_title_unique_violation(
  connection: api.IConnection,
) {
  /**
   * Validates that updating an article's title to duplicate another article's
   * title within the same channel will fail due to a unique constraint.
   *
   * Business flow:
   *
   * 1. Register a customer to obtain authentication.
   * 2. (Setup restriction) Assume two articles in the same channel with different
   *    titles, as the creation API is not provided.
   * 3. Attempt to update the second article's title to match the first. The API
   *    must reject this with a unique constraint error.
   * 4. Assert that the operation fails using TestValidator.error, verifying
   *    enforcement of unique article titles per channel.
   *
   * Note: Actual test DB setup for article existence should be handled by
   * fixtures or environment, as only update/join endpoints are exposed.
   */
  // 1. Register a customer for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerName = RandomGenerator.name();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: null,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Setup: Presume two articles exist in the same channel (cannot be created here)
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const articleId1 = typia.random<string & tags.Format<"uuid">>();
  const articleId2 = typia.random<string & tags.Format<"uuid">>();
  const title1 = RandomGenerator.paragraph({ sentences: 2 });
  // title2 intentionally different but unused, as only the duplicate attempt is validated

  // 3. Attempt to update article2's title to match article1's title (duplicate)
  await TestValidator.error(
    "should throw error when updating article2's title to duplicate article1's title in same channel",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.update(
        connection,
        {
          articleId: articleId2,
          body: {
            channel_id: channelId,
            title: title1,
          } satisfies IShoppingMallAiBackendArticle.IUpdate,
        },
      );
    },
  );
}
