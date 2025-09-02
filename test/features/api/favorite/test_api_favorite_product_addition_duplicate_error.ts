import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";

export async function test_api_favorite_product_addition_duplicate_error(
  connection: api.IConnection,
) {
  /**
   * Test that an error is returned if attempting to add a product to favorites
   * when it is already favorited within the group. Register a new customer,
   * create a favorite group, create a product, add it to the favorites, then
   * attempt to add it again. Confirm the endpoint returns a duplication error
   * or a no-op response according to business logic.
   *
   * Steps:
   *
   * 1. Register a customer and establish authentication.
   * 2. Create a favorite group for the customer.
   * 3. Fabricate a product ID to simulate a product (random UUID).
   * 4. Add the product to the favorite group.
   * 5. Attempt to add the same product again, expecting an error or no effect.
   * 6. Validate business rule enforcement by expecting an error or
   *    prevent-duplicate response.
   */

  // 1. Register a new customer and get authentication
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(authorized);
  const customer = authorized.customer;
  typia.assert(customer);

  // 2. Create a favorite group for the new customer
  const favoriteGroup =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          target_type: "folder",
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favoriteGroup);

  // 3. Simulate a product ID
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 4. Add the product to the favorite group (first time)
  const createdFavoriteProduct =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.create(
      connection,
      {
        favoriteId: favoriteGroup.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favoriteGroup.id,
          shopping_mall_ai_backend_product_id: productId,
        } satisfies IShoppingMallAiBackendFavoriteProduct.ICreate,
      },
    );
  typia.assert(createdFavoriteProduct);

  // 5. Attempt to add the same product again
  await TestValidator.error(
    "duplicate favorite product addition should fail or no-op",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.products.create(
        connection,
        {
          favoriteId: favoriteGroup.id,
          body: {
            shopping_mall_ai_backend_favorite_id: favoriteGroup.id,
            shopping_mall_ai_backend_product_id: productId,
          } satisfies IShoppingMallAiBackendFavoriteProduct.ICreate,
        },
      );
    },
  );
}
