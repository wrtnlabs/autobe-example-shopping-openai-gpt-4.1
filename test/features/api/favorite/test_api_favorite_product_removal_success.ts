import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";

export async function test_api_favorite_product_removal_success(
  connection: api.IConnection,
) {
  /**
   * Validate that a customer can remove a product from their favorites group
   * (folder).
   *
   * 1. Register and authenticate as a new customer via /auth/customer/join. This
   *    automatically sets the correct access token in connection.
   * 2. Create a favorite group using /shoppingMallAiBackend/customer/favorites
   *    (group/folder is required to organize favorites).
   * 3. Emulate a product entity by generating a random UUID for the product ID (no
   *    product creation API is available).
   * 4. Add the product to the favorite group via POST
   *    /.../favorites/{favoriteId}/products. Validate the mapping is created.
   * 5. Remove the product from favorites group via DELETE
   *    /.../favorites/{favoriteId}/products/{productId}.
   * 6. (Skipped) Validation of removal cannot be performed as no list/lookup API
   *    exists for group contents.
   *
   * All steps use explicitly typed, randomly generated valid data per DTO
   * format constraints.
   */

  // 1. Register a new customer & authenticate
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: customerCredentials,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;
  typia.assert(customer);

  // 2. Create a favorite folder for this customer
  const favoriteGroupInput = {
    shopping_mall_ai_backend_customer_id: customer.id,
    target_type: "favorite-folder",
    title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const favoriteGroup =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: favoriteGroupInput },
    );
  typia.assert(favoriteGroup);

  // 3. Generate a product id as if there were a product to favorite
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 4. Add the product as favorite under this group
  const favoriteProductMappingInput = {
    shopping_mall_ai_backend_favorite_id: favoriteGroup.id,
    shopping_mall_ai_backend_product_id: productId,
  } satisfies IShoppingMallAiBackendFavoriteProduct.ICreate;
  const favoriteProductMapping =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.create(
      connection,
      {
        favoriteId: favoriteGroup.id,
        body: favoriteProductMappingInput,
      },
    );
  typia.assert(favoriteProductMapping);

  // 5. Remove the product from the favorites group
  await api.functional.shoppingMallAiBackend.customer.favorites.products.erase(
    connection,
    {
      favoriteId: favoriteGroup.id,
      productId: productId,
    },
  );
  // No further assertions are possible as there is no product favorites list/read API exposed.
}
