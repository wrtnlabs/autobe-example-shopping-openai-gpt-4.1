import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

export async function test_api_article_creation_duplicate_title_in_channel_error(
  connection: api.IConnection,
) {
  /**
   * Test that creating a second article with the same title in the same channel
   * fails due to unique constraint.
   *
   * Steps:
   *
   * 1. Register a customer for authoring.
   * 2. Generate a random channel_id (uuid) to simulate a content channel.
   * 3. Pick a unique article title.
   * 4. Create one article with that title in the channel.
   * 5. Attempt to create another article with the same title in the same channel
   *    (should fail).
   * 6. Assert the second attempt fails with uniqueness violation.
   */

  // 1. Register customer for authentication and author context
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;

  // 2. Generate a random channel ID (uuid)
  const channel_id = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a unique title for both articles
  const articleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 16,
  });

  // 4. Successful creation of the first article in the channel with the unique title
  const createOneInput: IShoppingMallAiBackendArticle.ICreate = {
    channel_id,
    title: articleTitle,
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    author_id: customer.id,
    status: "published",
    is_notice: false,
    pinned: false,
    view_count: 0,
  };
  const firstArticle =
    await api.functional.shoppingMallAiBackend.customer.articles.create(
      connection,
      { body: createOneInput },
    );
  typia.assert(firstArticle);

  // 5. Attempt to create another article in the same channel with the same title
  const createTwoInput: IShoppingMallAiBackendArticle.ICreate = {
    channel_id,
    title: articleTitle,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    author_id: customer.id,
    status: "published",
    is_notice: false,
    pinned: false,
    view_count: 0,
  };

  // 6. Assert that the API blocks the duplicate title in channel
  await TestValidator.error(
    "should block duplicate article title in channel",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.create(
        connection,
        { body: createTwoInput },
      );
    },
  );
}
