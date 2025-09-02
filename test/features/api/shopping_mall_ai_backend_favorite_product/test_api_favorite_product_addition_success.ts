import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";

export async function test_api_favorite_product_addition_success(
  connection: api.IConnection,
) {
  /**
   * Test adding a product to a customer's favorites within a specific favorite
   * group.
   *
   * Steps:
   *
   * 1. Register a new customer and obtain authentication.
   * 2. Create a favorites group/folder for that customer (target_type: product).
   * 3. Generate a test product ID (simulating a real product).
   * 4. Add the product to the customer’s favorite group via API.
   * 5. Assert that the association is created and correctly links favorite group
   *    and product IDs.
   */

  // 1. Register a new customer for authentication
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(authorized);
  const customer = authorized.customer;

  // 2. Create a favorites group/folder for this customer (target_type: "product")
  const favoriteGroupInput: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: customer.id,
    target_type: "product",
    title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const favoriteGroup =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: favoriteGroupInput,
      },
    );
  typia.assert(favoriteGroup);

  // 3. Generate a mock product ID (simulate a real product's UUID, as no product create endpoint is given)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 4. Add the product to the customer’s favorite group
  const favoriteProductInput: IShoppingMallAiBackendFavoriteProduct.ICreate = {
    shopping_mall_ai_backend_favorite_id: favoriteGroup.id,
    shopping_mall_ai_backend_product_id: productId,
  };
  const favoriteProduct =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.create(
      connection,
      {
        favoriteId: favoriteGroup.id,
        body: favoriteProductInput,
      },
    );
  typia.assert(favoriteProduct);

  // 5. Validate the returned mapping object links the correct favorite group & product
  TestValidator.equals(
    "favorite-product mapping links to correct favorite group",
    favoriteProduct.shopping_mall_ai_backend_favorite_id,
    favoriteGroup.id,
  );
  TestValidator.equals(
    "favorite-product mapping links to correct product ID",
    favoriteProduct.shopping_mall_ai_backend_product_id,
    productId,
  );
}
