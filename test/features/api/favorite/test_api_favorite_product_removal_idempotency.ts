import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";

export async function test_api_favorite_product_removal_idempotency(
  connection: api.IConnection,
) {
  /**
   * Validates idempotency and error-free operation of the endpoint for removing
   * a product from favorites even when the mapping did not exist.
   *
   * This tests that deleting a non-existent favorite mapping (favoriteId +
   * productId) for a product (never added or already deleted) always completes
   * successfully without error.
   *
   * 1. Register a new customer and authenticate.
   * 2. Create a new favorite group/folder for the customer.
   * 3. Generate a UUID to use as a fake productId (since product creation is
   *    unsupported in this SDK scope).
   * 4. Attempt to DELETE the mapping for this product from the favorite group
   *    (never mapped).
   * 5. Assert no error occurs and the API responds successfully (void).
   */

  // 1. Register & authenticate customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customer = auth.customer;

  // 2. Create favorite group/folder
  const favoriteGroupInput = {
    shopping_mall_ai_backend_customer_id: customer.id,
    target_type: "folder", // Folder/group context; since we want a "favorite group"
    title_snapshot: RandomGenerator.name(2),
    // Not creating as a subfolder, so no folder_id
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const favoriteGroup =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: favoriteGroupInput },
    );
  typia.assert(favoriteGroup);

  // 3. Generate a random UUID as fake productId (since SDK does not provide product create)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to delete the mapping (it does not exist)
  await api.functional.shoppingMallAiBackend.customer.favorites.products.erase(
    connection,
    {
      favoriteId: favoriteGroup.id,
      productId,
    },
  );
  // If no error was thrown, idempotency and error-free policy is confirmed
  TestValidator.predicate(
    "delete of nonexistent favorite-product mapping succeeds and is idempotent",
    true,
  );
}
