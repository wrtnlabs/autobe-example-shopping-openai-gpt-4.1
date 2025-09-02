import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_seller_favorite_detail_success(
  connection: api.IConnection,
) {
  /** 1. Register and authenticate a seller account for proper API access. */
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessRegistration = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: businessRegistration,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);
  const sellerId = typia.assert(sellerAuth.seller.id);

  /**
   * 2. Simulate a favorite entry for this seller (no creation API available). The
   *    favorite must appear as if owned by this seller.
   */
  const favorite: IShoppingMallAiBackendFavorite = {
    ...typia.random<IShoppingMallAiBackendFavorite>(),
    shopping_mall_ai_backend_customer_id: sellerId,
  };
  typia.assert(favorite);

  /** 3. Retrieve favorite detail using the correct favoriteId for the seller. */
  const detail = await api.functional.shoppingMallAiBackend.seller.favorites.at(
    connection,
    {
      favoriteId: favorite.id,
    },
  );
  typia.assert(detail);

  /** 4. Validate returned detail matches expected favorite and seller context. */
  TestValidator.equals("favorite id matches", detail.id, favorite.id);
  TestValidator.equals(
    "favorite belongs to seller",
    detail.shopping_mall_ai_backend_customer_id,
    sellerId,
  );

  /** 5. Attempt access with a random (unauthorized) favorite id; should error. */
  await TestValidator.error(
    "seller cannot access non-owned favorite",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.at(
        connection,
        {
          favoriteId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
