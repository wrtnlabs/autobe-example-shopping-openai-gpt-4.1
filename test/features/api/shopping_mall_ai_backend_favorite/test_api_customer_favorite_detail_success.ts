import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

/**
 * Test successful retrieval of a customer's favorite detail.
 *
 * This test simulates the process by which an authenticated customer can
 * fetch details about a specific favorite by its ID. Steps:
 *
 * 1. Registers a new customer and acquires proper authentication.
 * 2. Uses a simulated favoriteId due to lack of creation endpoint, then
 *    retrieves favorite detail.
 * 3. Verifies the returned favorite matches requested favoriteId and belongs
 *    to this customer.
 * 4. Asserts DTO type integrity and logical ownership.
 * 5. Confirms business rule that no data leak occurs (favorite is not marked
 *    deleted).
 */
export async function test_api_customer_favorite_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(auth);

  // 2. Simulate the favoriteId since there is no favorite creation API
  const favoriteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve detail for the favorite
  const favorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.at(
      connection,
      { favoriteId },
    );
  typia.assert(favorite);

  // 4. Validate that the returned favorite matches the requested ID and belongs to the authenticated customer
  TestValidator.equals(
    "favorite.id matches requested favoriteId",
    favorite.id,
    favoriteId,
  );
  TestValidator.equals(
    "favorite belongs to authenticated customer",
    favorite.shopping_mall_ai_backend_customer_id,
    auth.customer.id,
  );
  TestValidator.predicate("favorite is not deleted", !favorite.deleted_at);
}
