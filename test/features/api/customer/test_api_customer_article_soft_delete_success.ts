import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful soft deletion (logical deletion) of an article by its
 * author.
 *
 * This test verifies that an authenticated customer can perform a soft
 * delete of an article (logical deletion) using the
 * /shoppingMallAiBackend/customer/articles/{articleId} DELETE endpoint.
 *
 * Due to missing article creation/retrieval APIs and schema, the test
 * cannot create a real article beforehand or validate the deleted_at state
 * or update blocking. As such, it focuses solely on successful endpoint
 * invocation under proper authentication.
 *
 * Steps:
 *
 * 1. Register a customer via /auth/customer/join and acquire auth context.
 * 2. (Assumed) Existence of an article by this customer (creation step
 *    omitted, not possible).
 * 3. Delete the article by calling the DELETE endpoint with a UUID as
 *    articleId.
 * 4. Verify that the API call completes successfully, indicating a logical
 *    delete (soft delete).
 *
 * If article retrieval/update functionality becomes available, additional
 * assertions for deleted_at status and update restriction should be added.
 */
export async function test_api_customer_article_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Register customer and establish authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "testPassword!123",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);

  // 2. (Assume) The existence of an article authored by this customer
  // 3. Attempt to soft delete (logical delete) the article
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.shoppingMallAiBackend.customer.articles.erase(
    connection,
    { articleId },
  );
  // 4. No further validation possible with current API surface
}
