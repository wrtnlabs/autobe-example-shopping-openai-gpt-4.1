import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";

export async function test_api_favorite_product_detail_view_success(
  connection: api.IConnection,
) {
  /**
   * E2E: Successfully view detail of a product added as favorite in a customer
   * favorite group.
   *
   * This test validates end-to-end successful flow:
   *
   * 1. Register a customer and ensure authentication context.
   * 2. Create a favorite group/folder for the authenticated customer.
   * 3. Simulate a product by generating a valid product UUID (no create API
   *    exposed).
   * 4. Add this product to the favorite group via the respective API, mapping all
   *    required references.
   * 5. Use GET
   *    /shoppingMallAiBackend/customer/favorites/{favoriteId}/products/{productId}
   *    endpoint to retrieve detail.
   * 6. Assert response has correct favoriteId/productId and timestamp. Confirm the
   *    linkage matches the added favorite.
   */
  // 1. Customer Registration & Auth
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "customer registration resulted in matching email/phone/name",
    joinResult.customer.email,
    joinInput.email,
  );
  TestValidator.equals(
    "customer account must be active",
    joinResult.customer.is_active,
    true,
  );
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );

  // 2. Create Favorite Group
  const favoriteInput = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    target_type: "product",
    title_snapshot: RandomGenerator.name(2),
    target_id_snapshot: null,
    shopping_mall_ai_backend_favorite_folder_id: null,
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const createdFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: favoriteInput },
    );
  typia.assert(createdFavorite);
  TestValidator.equals(
    "favorite assigned to customer",
    createdFavorite.shopping_mall_ai_backend_customer_id,
    joinResult.customer.id,
  );
  TestValidator.equals(
    "favorite target_type is product",
    createdFavorite.target_type,
    "product",
  );
  TestValidator.equals(
    "target id snapshot is null for group",
    createdFavorite.target_id_snapshot,
    null,
  );

  // 3. Simulate Product UUID (no create API exposed)
  const newProductId = typia.random<string & tags.Format<"uuid">>();

  // 4. Add Product to Favorite Group
  const addFavoriteProductInput = {
    shopping_mall_ai_backend_favorite_id: createdFavorite.id,
    shopping_mall_ai_backend_product_id: newProductId,
  } satisfies IShoppingMallAiBackendFavoriteProduct.ICreate;
  const favoriteProductLink =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.create(
      connection,
      {
        favoriteId: createdFavorite.id,
        body: addFavoriteProductInput,
      },
    );
  typia.assert(favoriteProductLink);
  TestValidator.equals(
    "favoriteProductLink favoriteId matches group",
    favoriteProductLink.shopping_mall_ai_backend_favorite_id,
    createdFavorite.id,
  );
  TestValidator.equals(
    "favoriteProductLink productId matches created product",
    favoriteProductLink.shopping_mall_ai_backend_product_id,
    newProductId,
  );

  // 5. GET product detail from favorite group
  const favoriteProductDetail =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.at(
      connection,
      {
        favoriteId: createdFavorite.id,
        productId: newProductId,
      },
    );
  typia.assert(favoriteProductDetail);
  TestValidator.equals(
    "product detail favorite id matches group",
    favoriteProductDetail.shopping_mall_ai_backend_favorite_id,
    createdFavorite.id,
  );
  TestValidator.equals(
    "product detail product id matches",
    favoriteProductDetail.shopping_mall_ai_backend_product_id,
    newProductId,
  );
  TestValidator.equals(
    "product favorite mapping record id matches",
    favoriteProductDetail.id,
    favoriteProductLink.id,
  );
  TestValidator.predicate(
    "created_at is a valid ISO datetime string",
    typeof favoriteProductDetail.created_at === "string" &&
      !isNaN(Date.parse(favoriteProductDetail.created_at)),
  );
}
