import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";
import type { IPageIShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate paginated and filtered retrieval of products favorited by a
 * customer in a specific favorite group.
 *
 * This test simulates the full business workflow:
 *
 * 1. Register a new customer, receiving an authentication token and customer
 *    info.
 * 2. Create a favorite group/folder for this customer.
 * 3. Register a new (mocked) product and associate it with this favorite group
 *    by creating a favorite-product entry (business logic assumes the
 *    product exists; use random uuid).
 * 4. Add the product to the favorite group (prerequisite for listing
 *    scenario).
 * 5. Retrieve a paginated, filtered list of favorited products for this group
 *    using the PATCH endpoint, specifying pagination (e.g., limit=1,
 *    page=1) and optional sorting or filtering.
 * 6. Verify the paginated response includes the expected product IDs and
 *    respects current page, limit, records, and pages properties. Assert
 *    the retrieved data matches product(s) previously favorited and the
 *    pagination info is correct.
 *
 * Assumptions:
 *
 * - Product creation endpoint is not provided, so products are represented by
 *   random UUIDs only for favoriting/testing.
 * - Only schema-defined properties are used throughout.
 */
export async function test_api_favorite_products_pagination_and_filtering_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerJoin: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerJoin);
  const customer = customerJoin.customer;

  // 2. Create a favorite folder/group for the customer
  const favorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          target_type: "product",
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 3. (Mocked) Create a product by generating a random UUID, and favorite it
  const productId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Add the product to the favorite group (mapping creation)
  const favoriteProduct: IShoppingMallAiBackendFavoriteProduct =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.create(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favorite.id,
          shopping_mall_ai_backend_product_id: productId,
        } satisfies IShoppingMallAiBackendFavoriteProduct.ICreate,
      },
    );
  typia.assert(favoriteProduct);

  // 5. Retrieve paginated, filtered list (page 1, limit 1)
  const resultPage: IPageIShoppingMallAiBackendFavoriteProduct.ISummary =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.index(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAiBackendFavoriteProduct.IRequest,
      },
    );
  typia.assert(resultPage);

  // 6. Verify paginated response properties and content
  TestValidator.equals(
    "pagination: current page is 1",
    resultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: page limit is 1",
    resultPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination: at least 1 record exists",
    resultPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination: pages >= 1",
    resultPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data: favorited product ID is present in listing",
    resultPage.data.some(
      (summary) => summary.shopping_mall_ai_backend_product_id === productId,
    ),
  );
}
