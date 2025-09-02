import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_article_comment_creation_invalid_content(
  connection: api.IConnection,
) {
  /**
   * Validate creation failure for article comments with invalid body as a
   * customer.
   *
   * 1. Register/authenticate a customer (POST /auth/customer/join)
   * 2. Try to create a comment with 'body' as empty string
   * 3. Try to create a comment with 'body' too short (business validation failure)
   * 4. Check that each returns a validation error.
   */
  // Step 1: Customer registration/join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerName = RandomGenerator.name();
  const authorized = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(authorized);
  const customer = authorized.customer;

  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Attempt creation with empty string body
  await TestValidator.error(
    "should fail when 'body' is empty string",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
        connection,
        {
          articleId: articleId,
          body: {
            author_id: customer.id,
            article_id: articleId,
            body: "",
            is_secret: false,
          } satisfies IShoppingMallAiBackendArticleComment.ICreate,
        },
      );
    },
  );
  // Step 3: Attempt creation with too short body
  await TestValidator.error(
    "should fail when 'body' is too short",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.articles.comments.create(
        connection,
        {
          articleId: articleId,
          body: {
            author_id: customer.id,
            article_id: articleId,
            body: "ab", // < 3 chars, assuming too short per business requirement
            is_secret: false,
          } satisfies IShoppingMallAiBackendArticleComment.ICreate,
        },
      );
    },
  );
}
