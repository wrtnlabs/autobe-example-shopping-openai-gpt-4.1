import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_favorite_customer_search_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Searching and paginating customer favorites (success case).
   *
   * This test validates the full workflow for searching and paginating a
   * customer's favorites via PATCH /shoppingMallAiBackend/customer/favorites.
   * The workflow is as follows:
   *
   * 1. Register and authenticate a customer (creating a valid session).
   * 2. Programmatically assume that favorites are added (the scenario and
   *    available APIs do not provide a favorite-adding endpoint).
   * 3. Search the favorites with filtering (by type, folder, etc) and pagination
   *    criteria using the PATCH endpoint.
   * 4. Check that the results are correctly filtered by type/folder, paginated
   *    accurately, and only include records owned by the authenticated
   *    customer.
   *
   * Note: Since there is no API provided to create favorites, this test can
   * only validate the search and pagination using empty or default data.
   * If/when a favorite creation API is introduced, this test should be extended
   * to programmatically add explicit test favorites of each type so the search
   * has meaningful data to assert.
   */

  // 1. Register and authenticate a customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.customer.id;

  // 2. Assume favorites exist for the customer (no API to explicitly add them)
  // Skipped: Awaiting favorite-adding endpoint in API to enable real setup.

  // 3. Perform filtered searches with type/folder/pagination
  // Example filter: Query for type = 'product'
  let output =
    await api.functional.shoppingMallAiBackend.customer.favorites.index(
      connection,
      {
        body: {
          target_type: "product",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAiBackendFavorite.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "favorites result is array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "pagination meta present",
    typeof output.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination meta present",
    typeof output.pagination.limit === "number",
  );

  // Example filter: Query for type = 'address'
  output = await api.functional.shoppingMallAiBackend.customer.favorites.index(
    connection,
    {
      body: {
        target_type: "address",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAiBackendFavorite.IRequest,
    },
  );
  typia.assert(output);

  // Example filter: Query with no type (all favorites)
  output = await api.functional.shoppingMallAiBackend.customer.favorites.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAiBackendFavorite.IRequest,
    },
  );
  typia.assert(output);

  // Attempt filtering on a specific (fake/random) folder ID
  const testFolderId = typia.random<string & tags.Format<"uuid">>();
  output = await api.functional.shoppingMallAiBackend.customer.favorites.index(
    connection,
    {
      body: {
        folder_id: testFolderId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAiBackendFavorite.IRequest,
    },
  );
  typia.assert(output);

  // Validate that results are for the current customer and match the filter (cannot verify full correctness without explicit add-favorite API)
  for (const fav of output.data) {
    TestValidator.predicate(
      "favorite target_type matches filter or no filter",
      !fav.target_type ||
        fav.target_type === "product" ||
        fav.target_type === "address" ||
        fav.target_type === "inquiry",
    );
    // Cannot check customer ownership due to absence of customer_id in ISummary
  }
  TestValidator.predicate(
    "pagination current page valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count matches data length or is valid",
    output.data.length <= output.pagination.limit,
  );
}
