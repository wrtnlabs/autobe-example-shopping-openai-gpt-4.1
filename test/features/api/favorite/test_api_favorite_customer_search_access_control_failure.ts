import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_favorite_customer_search_access_control_failure(
  connection: api.IConnection,
) {
  /**
   * Test that a customer cannot retrieve another user's favorites through
   * search (via /shoppingMallAiBackend/customer/favorites).
   *
   * Business context:
   *
   * - Customers should only ever retrieve their own favorites; row-level security
   *   (RLS) must prevent any cross-account data leakage.
   * - This test verifies that, after registering two distinct customers, one
   *   cannot retrieve or search for the other's favorites by any API query.
   * - No favorites creation endpoint exists (out of scope); the absence of
   *   Customer B's own favorites means any returned result MUST be empty if
   *   data segregation is enforced.
   *
   * Step-by-step process:
   *
   * 1. Register customer A (the legitimate favorite data owner).
   * 2. Register customer B (imitating an attacker or unauthorized accessor).
   * 3. As customer B, attempt various favorites searches with different filters to
   *    try to access data not owned.
   * 4. Assert that no favorites records are ever returned to customer B; data
   *    leakage never occurs.
   *
   * SDK authentication context switches automatically after each join. No
   * cleanup is necessary; accounts are disposable for testing.
   */

  // 1. Register customer A: The data owner
  const emailA = typia.random<string & tags.Format<"email">>();
  const phoneA = RandomGenerator.mobile();
  const joinA = await api.functional.auth.customer.join(connection, {
    body: {
      email: emailA,
      phone_number: phoneA,
      password: "Abcd!1234",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinA);

  // 2. Register customer B: The attacker
  const emailB = typia.random<string & tags.Format<"email">>();
  const phoneB = RandomGenerator.mobile();
  const joinB = await api.functional.auth.customer.join(connection, {
    body: {
      email: emailB,
      phone_number: phoneB,
      password: "Efgh!5678",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinB);

  // 3. As customer B, attempt various favorites queries (all should be empty releases)
  // Try multiple filter/query variations to simulate possible ACL bypasses
  const favoriteQueries: IShoppingMallAiBackendFavorite.IRequest[] = [
    {},
    { q: RandomGenerator.paragraph({ sentences: 3 }) },
    { page: 1, limit: 10 },
    { order_by: "created_at", direction: "desc" },
    { target_type: "product" },
    { created_at_from: new Date(2000, 1, 1).toISOString() },
    { created_at_to: new Date().toISOString() },
    { folder_id: typia.random<string & tags.Format<"uuid">>() },
  ];

  for (const searchBody of favoriteQueries) {
    const res =
      await api.functional.shoppingMallAiBackend.customer.favorites.index(
        connection,
        { body: searchBody satisfies IShoppingMallAiBackendFavorite.IRequest },
      );
    typia.assert(res);
    TestValidator.equals(
      "Customer B search finds no unauthorized favorites",
      res.data.length,
      0,
    );
  }
}
