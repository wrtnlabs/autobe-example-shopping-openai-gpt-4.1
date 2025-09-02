import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";

export async function test_api_favorite_product_detail_not_found_error(
  connection: api.IConnection,
) {
  /**
   * Test error handling for accessing a non-favorited product's details in a
   * favorite group.
   *
   * Validates the backend returns an error when attempting to view details for
   * a product that has NOT been added to the specified favorite group.
   *
   * Steps:
   *
   * 1. Register a new customer.
   * 2. Create a favorite group for the customer.
   * 3. Generate a random productId (uuid) that is not favorited.
   * 4. Attempt to fetch the product's details from the favorite group.
   * 5. Confirm error (should be 404 not found or permission denied).
   */

  // 1. Register a customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.customer.id;

  // 2. Create a favorite group
  const favoriteGroup =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          target_type: "product",
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favoriteGroup);
  const favoriteId = favoriteGroup.id;

  // 3. Generate a random productId that is NOT favorited
  const unrelatedProductId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to fetch detail for this product in the favorite group (should fail)
  await TestValidator.error(
    "error when requesting detail of a product not favorited in group",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.products.at(
        connection,
        {
          favoriteId,
          productId: unrelatedProductId,
        },
      );
    },
  );
}
