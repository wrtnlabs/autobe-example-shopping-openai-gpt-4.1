import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that a customer cannot soft delete (logical delete) a favorite
 * belonging to another customer (ownership enforcement).
 *
 * Business context: Only the owner (customer) of a favorite should be able
 * to logically delete (soft delete) it. Attempts by another customer must
 * fail with an error, such as forbidden (403) or not found (404). This test
 * asserts that cross-user data access is prevented by the API.
 *
 * Steps:
 *
 * 1. Register and authenticate Customer1 (the owner of a favorite)
 * 2. Simulate obtaining a favoriteId owned by Customer1 (no create API
 *    provided, so use random valid UUID)
 * 3. Register and authenticate Customer2 (switch auth context so connection
 *    represents Customer2)
 * 4. Attempt to delete (erase) Customer1's favorite as Customer2 (should fail)
 * 5. Assert that the operation fails with an error, confirming correct
 *    ownership enforcement on soft delete
 */
export async function test_api_favorite_soft_delete_not_owned(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Customer1 (favorite owner)
  const customer1Input = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "Test!234",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customer1Auth = await api.functional.auth.customer.join(connection, {
    body: customer1Input,
  });
  typia.assert(customer1Auth);

  // Simulate a favoriteId owned by Customer1 (since creation API is unavailable)
  const customer1FavoriteId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register and authenticate Customer2 (switching context)
  const customer2Input = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "Test!234",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customer2Auth = await api.functional.auth.customer.join(connection, {
    body: customer2Input,
  });
  typia.assert(customer2Auth);

  // 3. Customer2 attempts to delete Customer1's favorite
  await TestValidator.error(
    "Customer2 cannot delete a favorite owned by another customer",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.erase(
        connection,
        { favoriteId: customer1FavoriteId },
      );
    },
  );
}
