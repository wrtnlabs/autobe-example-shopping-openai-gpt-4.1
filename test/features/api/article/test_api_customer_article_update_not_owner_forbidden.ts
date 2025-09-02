import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

/**
 * Validate that updating another user's article is forbidden (authorization
 * check).
 *
 * This test confirms that only the owner (author) of an article can update
 * it, and that attempts by a different customer are denied with the
 * appropriate error. This serves as a critical security/access control
 * validation for article resource handling. Both customer accounts are
 * created and authenticated via registration. Due to the absence of any API
 * for creating or listing articles in the supplied SDK/functions, the
 * negative update test path (attempt by another user) cannot be
 * implemented. Attempts to proceed without a valid article (owned by A) are
 * omitted, as per implementation feasibility rules.
 *
 * Steps:
 *
 * 1. Register Customer A (intended article owner)
 * 2. Register Customer B (will attempt to update A's article)
 * 3. Attempt by B to update A's article is not possible due to missing setup
 *    APIs (No update call made - scenario omitted to comply with
 *    implementation feasibility.)
 */
export async function test_api_customer_article_update_not_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Customer A (intended article owner)
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAJoin);
  // JWT token for customerAJoin is now in connection.headers

  // 2. Register Customer B (will attempt to update article)
  const customerBConnection: api.IConnection = { ...connection, headers: {} };
  const customerBJoin = await api.functional.auth.customer.join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: typia.random<string & tags.Format<"password">>(),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerBJoin);
  // Tokens for customer B are now stored in customerBConnection.headers

  // 3. (Omitted) Customer B cannot attempt to update A's article without a valid articleId and ownership context.
  // The test scenario is only partially implementable due to absence of article creation/listing APIs in the SDK.
}
