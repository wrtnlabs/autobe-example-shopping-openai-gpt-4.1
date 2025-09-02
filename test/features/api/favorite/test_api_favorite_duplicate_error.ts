import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_duplicate_error(
  connection: api.IConnection,
) {
  /**
   * Test creation of a duplicate favorite for the same target by the same
   * customer.
   *
   * 1. Register a customer to get authentication context.
   * 2. As the newly registered customer, create a favorite with a concrete
   *    target_type and unique target_id_snapshot (simulating e.g., favoriting a
   *    product or address).
   * 3. Attempt to create another favorite for the exact same target (same
   *    target_type, same target_id_snapshot) with the same customer.
   * 4. Expect the API to reject the duplicate, enforcing uniqueness constraint and
   *    responding with a business logic error.
   */
  // 1. Register customer and authenticate
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const authorized = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(authorized);
  const customer = authorized.customer;
  typia.assert(customer);

  // 2. Create a favorite for a specific target (simulate with unique target_type/id)
  const favoriteTargetType = "product";
  const favoriteTargetId = typia.random<string & tags.Format<"uuid">>();
  const firstFavoriteInput = {
    shopping_mall_ai_backend_customer_id: customer.id,
    target_type: favoriteTargetType,
    target_id_snapshot: favoriteTargetId,
    // Optional fields left unset/null for simplicity
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const firstFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: firstFavoriteInput },
    );
  typia.assert(firstFavorite);
  TestValidator.equals(
    "first favorite - target_type matches input",
    firstFavorite.target_type,
    favoriteTargetType,
  );
  TestValidator.equals(
    "first favorite - target_id_snapshot matches input",
    firstFavorite.target_id_snapshot,
    favoriteTargetId,
  );
  TestValidator.equals(
    "first favorite - customer matches",
    firstFavorite.shopping_mall_ai_backend_customer_id,
    customer.id,
  );

  // 3. Attempt to favorite the same target again for the same customer; should fail with duplicate error
  const duplicateFavoriteInput = {
    shopping_mall_ai_backend_customer_id: customer.id,
    target_type: favoriteTargetType,
    target_id_snapshot: favoriteTargetId,
    // Optional fields left unset/null
  } satisfies IShoppingMallAiBackendFavorite.ICreate;

  await TestValidator.error(
    "duplicate favorite for same target/customer rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.create(
        connection,
        { body: duplicateFavoriteInput },
      );
    },
  );
}
