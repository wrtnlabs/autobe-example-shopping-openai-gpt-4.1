import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_favorites_list_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful paginated retrieval of seller favorites.
   *
   * 1. Register a new seller to create a clean authentication context for favorite
   *    retrieval.
   * 2. Call PATCH /shoppingMallAiBackend/seller/favorites with default filter.
   *
   *    - Assert valid pagination structure and types.
   *    - For each data element (if present), check ID/target_type fields.
   * 3. Call PATCH /shoppingMallAiBackend/seller/favorites with common filters
   *    (page, limit, random target_type/direction).
   *
   *    - Assert pagination fields match filter.
   *    - If data present, check target_type matches filter value.
   *
   * Note: Favorite creation is outside the scope (SDK does not provide), so
   * test focuses on listing under an authenticated context only.
   */

  // 1. Register seller; obtain authenticated context.
  const sellerInfo = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerInfo);

  // 2. List favorites with default filter (empty request body).
  const defaultRes =
    await api.functional.shoppingMallAiBackend.seller.favorites.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendFavorite.IRequest,
      },
    );
  typia.assert(defaultRes);
  TestValidator.predicate(
    "pagination current (default) is number",
    typeof defaultRes.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit (default) is number",
    typeof defaultRes.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records (default) is number",
    typeof defaultRes.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages (default) is number",
    typeof defaultRes.pagination.pages === "number",
  );
  if (defaultRes.data.length > 0) {
    defaultRes.data.forEach((fav) => {
      TestValidator.predicate(
        "favorite id is uuid",
        typeof fav.id === "string" && fav.id.length >= 32,
      );
      TestValidator.predicate(
        "favorite has target_type string",
        typeof fav.target_type === "string",
      );
      if (fav.title_snapshot !== undefined && fav.title_snapshot !== null)
        TestValidator.predicate(
          "favorite title_snapshot is string",
          typeof fav.title_snapshot === "string",
        );
      TestValidator.predicate(
        "favorite created_at is string",
        typeof fav.created_at === "string",
      );
    });
  }

  // 3. List favorites with pagination & filter.
  const filter: IShoppingMallAiBackendFavorite.IRequest = {
    page: 1,
    limit: 5,
    target_type: RandomGenerator.pick([
      "product",
      "address",
      "inquiry",
    ] as const),
    q: RandomGenerator.paragraph({ sentences: 1 }),
    direction: RandomGenerator.pick(["asc", "desc"] as const),
  };
  const filteredRes =
    await api.functional.shoppingMallAiBackend.seller.favorites.index(
      connection,
      {
        body: filter,
      },
    );
  typia.assert(filteredRes);
  TestValidator.equals(
    "pagination current (filtered)",
    filteredRes.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit (filtered)",
    filteredRes.pagination.limit,
    5,
  );
  if (filteredRes.data.length > 0) {
    filteredRes.data.forEach((fav) => {
      TestValidator.equals(
        "favorite target_type matches filter",
        fav.target_type,
        filter.target_type,
      );
    });
  }
}
