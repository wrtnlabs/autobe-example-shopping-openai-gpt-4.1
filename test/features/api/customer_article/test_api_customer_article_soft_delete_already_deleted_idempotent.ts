import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_article_soft_delete_already_deleted_idempotent(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for idempotency of soft-deleting an already deleted article
   * by a customer.
   *
   * Scenario:
   *
   * 1. Register a new customer (acquiring JWT authorization).
   * 2. (Simulate) Create an article ID (uuid) for testing, since creation endpoint
   *    is not in scope.
   * 3. Soft-delete the article via DELETE
   *    /shoppingMallAiBackend/customer/articles/{articleId}
   * 4. Attempt to soft-delete the same article a second time. Operation must
   *    succeed (no error).
   * 5. Validate that both calls do not throw, demonstrating idempotency of
   *    deletion.
   *
   * Notes:
   *
   * - The API does not expose article creation or get-by-id endpoints; testing is
   *   limited to deletion and authentication. We use typia.random to simulate
   *   an article UUID.
   * - Test passes if DELETE returns successfully both times without raising
   *   errors (runtime assertion via TestValidator.error not needed since we
   *   expect both to succeed).
   */

  // 1. Register and authenticate a customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "customerTestPwd123!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Simulate an article UUID (since article creation endpoint is not available)
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Soft-delete the article (first delete)
  await api.functional.shoppingMallAiBackend.customer.articles.erase(
    connection,
    {
      articleId,
    },
  );

  // 4. Attempt to delete the article again (second delete, should be idempotent & succeed)
  await api.functional.shoppingMallAiBackend.customer.articles.erase(
    connection,
    {
      articleId,
    },
  );

  // 5. If no errors are thrown, idempotency is confirmed according to API contract
}
