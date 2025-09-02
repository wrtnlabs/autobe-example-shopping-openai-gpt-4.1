import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

export async function test_api_article_detail_retrieve_success_public(
  connection: api.IConnection,
) {
  /**
   * Verify retrieval of a published article's full details by ID (public
   * endpoint).
   *
   * - Insert a published article entity with all mandatory fields, with
   *   deleted_at as null.
   * - Call the API to fetch the article by ID.
   * - Assert that all business-relevant, public, and required article fields are
   *   present and match the inserted data.
   * - This test only covers the successful positive path; negative scenarios are
   *   out of scope.
   */
  // 1. Simulate insertion of a published article entity (prepare data matching published state)
  const article: IShoppingMallAiBackendArticle = {
    id: typia.random<string & tags.Format<"uuid">>(),
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    author_id: typia.random<string & tags.Format<"uuid">>(),
    pinned: false,
    status: "published",
    view_count: typia.random<number & tags.Type<"int32">>(),
    is_notice: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 2. Retrieve the article via API
  const output: IShoppingMallAiBackendArticle =
    await api.functional.shoppingMallAiBackend.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(output);

  // 3. Validate all main business fields match
  TestValidator.equals("article id matches", output.id, article.id);
  TestValidator.equals(
    "channel id matches",
    output.channel_id,
    article.channel_id,
  );
  TestValidator.equals("title matches", output.title, article.title);
  TestValidator.equals("body matches", output.body, article.body);
  TestValidator.equals(
    "author id matches",
    output.author_id,
    article.author_id,
  );
  TestValidator.equals("status is published", output.status, "published");
  TestValidator.equals(
    "view count matches",
    output.view_count,
    article.view_count,
  );
  TestValidator.equals(
    "is_notice matches",
    output.is_notice,
    article.is_notice,
  );
  TestValidator.equals(
    "created at matches",
    output.created_at,
    article.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    output.updated_at,
    article.updated_at,
  );
  TestValidator.equals("deleted_at is null", output.deleted_at, null);
}
