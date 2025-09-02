import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteAddress";
import type { IPageIShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_customer_favorites_addresses_search_and_pagination_success(
  connection: api.IConnection,
) {
  /**
   * Validates paginated and filtered retrieval of favorited addresses within a
   * customer favorite folder.
   *
   * 1. Register a customer account via join (to get auth context)
   * 2. Customer creates a favorite folder (for organizing addresses)
   * 3. Customer creates a favorite of target_type 'address' in the folder
   * 4. Customer adds multiple favorite addresses to the favorite
   * 5. Retrieve paginated results (page=2, limit=3) and check correctness of
   *    returned data and meta
   * 6. Search for a substring of a favored address's snapshot and validate results
   *    contain it
   * 7. Request sort by created_at:desc and check strict descending order
   */
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name();
  // 1. Register customer
  const authorized = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(authorized);
  const customer = authorized.customer;

  // 2. Create favorite folder
  const folderName = RandomGenerator.name();
  const folderDescription = RandomGenerator.paragraph({ sentences: 6 });
  const favoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: folderName,
          description: folderDescription,
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(favoriteFolder);

  // 3. Create favorite (target_type: "address")
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          shopping_mall_ai_backend_favorite_folder_id: favoriteFolder.id,
          title_snapshot: "Favorite - Address",
          target_type: "address",
          target_id_snapshot: null,
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 4. Add multiple addresses to the favorite
  const addressEntries: IShoppingMallAiBackendFavoriteAddress[] = [];
  for (let i = 0; i < 7; ++i) {
    const address_snapshot = RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    });
    const favored =
      await api.functional.shoppingMallAiBackend.customer.favorites.addresses.create(
        connection,
        {
          favoriteId: favorite.id,
          body: {
            shopping_mall_ai_backend_favorite_id: favorite.id,
            shopping_mall_ai_backend_customer_id: customer.id,
            address_snapshot,
          } satisfies IShoppingMallAiBackendFavoriteAddress.ICreate,
        },
      );
    typia.assert(favored);
    addressEntries.push(favored);
  }
  // If API default sort is most-recent first, reverse to match submission order
  addressEntries.reverse();

  // 5. Paginate: limit = 3, page = 2
  const pageLimit = 3;
  const pageNum = 2;
  const addressPage =
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.index(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          page: pageNum,
          limit: pageLimit,
        } satisfies IShoppingMallAiBackendFavoriteAddress.IRequest,
      },
    );
  typia.assert(addressPage);
  TestValidator.predicate(
    "pagination returns correct count or last page remainder",
    addressPage.data.length === pageLimit ||
      addressPage.data.length === addressEntries.length % pageLimit,
  );
  TestValidator.equals(
    "pagination current page",
    addressPage.pagination.current,
    pageNum,
  );
  TestValidator.equals(
    "pagination limit",
    addressPage.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "pagination total records",
    addressPage.pagination.records,
    addressEntries.length,
  );
  TestValidator.equals(
    "pagination total pages",
    addressPage.pagination.pages,
    Math.ceil(addressEntries.length / pageLimit),
  );

  // Check returned addresses for this page match correct slice
  const expectedForPage = addressEntries.slice(
    pageLimit * (pageNum - 1),
    pageLimit * pageNum,
  );
  for (
    let i = 0;
    i < addressPage.data.length && i < expectedForPage.length;
    ++i
  ) {
    TestValidator.equals(
      "address id matches expected",
      addressPage.data[i].id,
      expectedForPage[i].id,
    );
    TestValidator.equals(
      "address snapshot matches expected",
      addressPage.data[i].address_snapshot,
      expectedForPage[i].address_snapshot,
    );
  }

  // 6. Search within addresses: use part of one address_snapshot
  if (addressEntries.length > 0) {
    const sampleAddress = addressEntries[2];
    const searchTerm = RandomGenerator.substring(
      sampleAddress.address_snapshot || "",
    );
    const searched =
      await api.functional.shoppingMallAiBackend.customer.favorites.addresses.index(
        connection,
        {
          favoriteId: favorite.id,
          body: {
            search: searchTerm,
          } satisfies IShoppingMallAiBackendFavoriteAddress.IRequest,
        },
      );
    typia.assert(searched);
    TestValidator.predicate(
      "at least one search result",
      searched.data.length > 0,
    );
    TestValidator.predicate(
      "all search result snapshots contain search term",
      searched.data.every((addr) =>
        (addr.address_snapshot || "").includes(searchTerm),
      ),
    );
  }

  // 7. Validate sorting: created_at:desc
  const sorted =
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.index(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          sort: "created_at:desc",
        } satisfies IShoppingMallAiBackendFavoriteAddress.IRequest,
      },
    );
  typia.assert(sorted);
  for (let i = 1; i < sorted.data.length; ++i) {
    TestValidator.predicate(
      "sorted created_at descending",
      sorted.data[i - 1].created_at >= sorted.data[i].created_at,
    );
  }
}
