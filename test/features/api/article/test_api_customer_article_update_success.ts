import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

export async function test_api_customer_article_update_success(
  connection: api.IConnection,
) {
  /**
   * 1. Register a new customer to establish authentication for subsequent
   *    requests.
   * 2. Create an article for the new customer (simulated since no create endpoint
   *    is provided).
   * 3. Issue an update (PUT) for the article, changing title, body, and status
   *    fields.
   * 4. Validate that the response reflects all the intended changes:
   *
   *    - The title is updated and unique within the (simulated) channel.
   *    - The body is updated (content length logic is assumed, input is non-empty).
   *    - The status reflects a valid transition (string, no enum enforced, but
   *         change value).
   *    - The updated_at timestamp is newer than created_at.
   *    - The id, channel_id remain consistent, author_id matches customer id.
   *
   * Note: Since no article-creation endpoint is supplied, simulate an article
   * for update using random values and the current customer as author.
   */

  // 1. Register a new customer (and login; Authorization header managed)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;

  // 2. (Simulate) Create an article for this customer—we construct input and output here
  //    This step would use a real API endpoint if available
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const article: IShoppingMallAiBackendArticle = {
    id: articleId,
    channel_id: channelId,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    author_id: customer.id,
    pinned: false,
    status: "draft",
    view_count: 0,
    is_notice: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 3. Define updated values (new title, new body, new status, toggle pin, notice)
  const updateInput = {
    channel_id: article.channel_id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }), // ensure different from previous
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 14,
      wordMin: 3,
      wordMax: 12,
    }),
    status: "published",
    pinned: true,
    is_notice: true,
  } satisfies IShoppingMallAiBackendArticle.IUpdate;

  // 4. Update the article using the API
  const updated =
    await api.functional.shoppingMallAiBackend.customer.articles.update(
      connection,
      {
        articleId: article.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Validation
  TestValidator.equals("id should not change", updated.id, article.id);
  TestValidator.equals(
    "channel_id should not change",
    updated.channel_id,
    article.channel_id,
  );
  TestValidator.equals(
    "author_id should match customer",
    updated.author_id,
    article.author_id,
  );
  TestValidator.equals("title is updated", updated.title, updateInput.title);
  TestValidator.equals("body is updated", updated.body, updateInput.body);
  TestValidator.equals("status is updated", updated.status, updateInput.status);
  TestValidator.equals("pinned is updated", updated.pinned, updateInput.pinned);
  TestValidator.equals(
    "is_notice is updated",
    updated.is_notice,
    updateInput.is_notice,
  );
  TestValidator.predicate(
    "updated_at is updated after created_at",
    Date.parse(updated.updated_at) >= Date.parse(updated.created_at),
  );
  TestValidator.notEquals(
    "updated_at timestamp should update",
    updated.updated_at,
    article.updated_at,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updated.deleted_at,
    null,
  );
}
