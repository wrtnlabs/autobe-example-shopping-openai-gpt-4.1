import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

/**
 * Validate NOT FOUND error for favorite detail retrieval with unknown
 * favoriteId.
 *
 * Registers a new customer to establish an authenticated session, then
 * attempts to retrieve the detail for a favorite using a valid (random)
 * UUID not associated with any favorite for this account. Expects the API
 * to return a NOT FOUND (or equivalent error), confirming that no
 * information is leaked and proper error handling occurs.
 *
 * Business necessity: Ensures users cannot retrieve details for favorites
 * they do not own, supporting data privacy and correct error logic.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new customer (guaranteed to have zero
 *    favorites)
 * 2. Generate a random UUID to use as a fake favoriteId
 * 3. Attempt to retrieve the favorite detail with this fake ID
 * 4. Assert that the API throws an error (NOT FOUND or forbidden)
 * 5. (Edge) Guarantees that the returned error is not a TypeScript compile
 *    error, but API error
 */
export async function test_api_customer_favorite_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register new customer (ensures a clean user context)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customerAuth);
  TestValidator.predicate(
    "customer is active after registration",
    customerAuth.customer.is_active === true,
  );

  // 2. Generate a random UUID as a fake favoriteId
  const fakeFavoriteId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve favorite detail; expect an error
  await TestValidator.error(
    "retrieving non-existent favorite must throw error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.at(
        connection,
        { favoriteId: fakeFavoriteId },
      );
    },
  );
}
