import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

/**
 * E2E test for successful article creation by an authenticated customer in
 * the shopping mall AI backend.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new customer using the join endpoint
 * 2. Use authenticated context to create an article via
 *    shoppingMallAiBackend/customer/articles
 * 3. Verify the response: system-generated article id, author_id matches
 *    customer, correct status
 *
 * Notes:
 *
 * - All user and article fields are generated to type and business
 *   constraints (unique email, valid phone, UUIDs)
 * - No channel lookup is possible without a channel API, so channel_id is
 *   randomly generated (in a real test, this should reference an existing
 *   channel)
 * - After creation all critical response fields are validated against the
 *   sent data and API contract
 */
export async function test_api_article_creation_customer_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new customer
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuth);

  // Step 2: Prepare valid article post body
  const articleInput: IShoppingMallAiBackendArticle.ICreate = {
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    author_id: customerAuth.customer.id,
    status: "published",
    is_notice: false,
    pinned: false,
    view_count: 0,
  };

  // Step 3: Post article and validate response
  const article: IShoppingMallAiBackendArticle =
    await api.functional.shoppingMallAiBackend.customer.articles.create(
      connection,
      { body: articleInput },
    );
  typia.assert(article);

  TestValidator.equals(
    "article.author_id matches customer",
    article.author_id,
    customerAuth.customer.id,
  );
  TestValidator.equals(
    "article.title matches request",
    article.title,
    articleInput.title,
  );
  TestValidator.equals(
    "article.body matches request",
    article.body,
    articleInput.body,
  );
  TestValidator.equals(
    "article.channel_id matches request",
    article.channel_id,
    articleInput.channel_id,
  );
  TestValidator.equals(
    "article.status matches request",
    article.status,
    "published",
  );
  TestValidator.equals(
    "article.is_notice matches request",
    article.is_notice,
    false,
  );
  TestValidator.equals("article.pinned matches request", article.pinned, false);
  TestValidator.equals(
    "article.view_count matches request",
    article.view_count,
    0,
  );

  // Validate that the system assigned a UUID as id
  TestValidator.predicate(
    "article id is valid UUID",
    typeof article.id === "string" && /^[0-9a-fA-F-]{36}$/.test(article.id),
  );
}
