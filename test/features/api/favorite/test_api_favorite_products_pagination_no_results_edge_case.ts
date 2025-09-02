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

export async function test_api_favorite_products_pagination_no_results_edge_case(
  connection: api.IConnection,
) {
  /**
   * Test paginated favorite products listing for the empty edge case: ensure
   * the API returns an empty result set and accurate pagination when no
   * products are in the group, including when using search filters or
   * requesting a page beyond available data.
   *
   * 1. Register a new customer (auth customer join) and obtain authentication.
   * 2. Create a new favorite folder/group for the customer (with target_type set
   *    to an arbitrary valid value, but with no products mapped).
   * 3. Request paginated favorite products using PATCH
   *    /shoppingMallAiBackend/customer/favorites/{favoriteId}/products with
   *    criteria guaranteed to match no records (e.g., a high page number and a
   *    filter string that cannot match any product).
   * 4. Assert the API returns pagination with 0 records and an empty data array,
   *    and pagination fields are consistent.
   */
  // 1. Register and login as a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "TestPassword123!",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customerId = auth.customer.id;

  // 2. Create a new favorite group/folder (target_type can be 'test-group-type'; target_id_snapshot & title_snapshot can be null).
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_favorite_folder_id: null,
          title_snapshot: null,
          target_type: "test-group-type",
          target_id_snapshot: null,
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 3. List favorite products for a folder with no products (edge case): request page 10, filter to random string.
  const page = 10;
  const request: IShoppingMallAiBackendFavoriteProduct.IRequest = {
    page,
    limit: 5,
    sort: "created_at,desc",
    filter:
      "unlikely_no_match_filter_string_" + RandomGenerator.alphaNumeric(8),
  };
  const output =
    await api.functional.shoppingMallAiBackend.customer.favorites.products.index(
      connection,
      {
        favoriteId: favorite.id,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination data array is empty", output.data, []);
  TestValidator.equals(
    "pagination records is zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is zero", output.pagination.pages, 0);
  // current may be 'page' if requested, otherwise may default to 1 even if page out of bounds, but pages is zero
}
