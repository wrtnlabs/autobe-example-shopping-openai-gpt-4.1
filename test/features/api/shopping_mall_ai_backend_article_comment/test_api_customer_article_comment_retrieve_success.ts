import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";

export async function test_api_customer_article_comment_retrieve_success(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Successful retrieval of a specific article comment by its author
   * (customer)
   *
   * Business Context: This test validates that an authenticated customer can
   * retrieve a specific comment on an article using the customer endpoint. Full
   * business-scenario coverage (article/comment creation) cannot be achieved
   * due to unavailable endpoints, so focus is placed on verifying schema
   * compliance and the API's ability to retrieve a comment record by ID as per
   * the current contract.
   *
   * Steps:
   *
   * 1. Register and authenticate a customer (sets Authorization header via
   *    /auth/customer/join).
   * 2. Attempt to retrieve a comment for a given article and comment, using
   *    randomly generated UUIDs (reflecting the absence of upstream creation
   *    APIs).
   * 3. Assert the response matches the contract (typia.assert), and that IDs in
   *    the response equal those in the request.
   */

  // 1. Register and authenticate a customer
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(auth);

  // 2. Retrieve a comment for a given article by UUIDs
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const comment: IShoppingMallAiBackendArticleComment =
    await api.functional.shoppingMallAiBackend.customer.articles.comments.at(
      connection,
      { articleId, commentId },
    );
  typia.assert(comment);

  // 3. Verify response fields match request parameters
  TestValidator.equals(
    "retrieved comment.article_id equals input",
    comment.article_id,
    articleId,
  );
  TestValidator.equals(
    "retrieved comment.id equals input",
    comment.id,
    commentId,
  );
}
