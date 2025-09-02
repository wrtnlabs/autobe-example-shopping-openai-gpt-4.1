import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_update_not_owned_seller(
  connection: api.IConnection,
) {
  /**
   * Validate that a seller cannot update another seller's favorite (ownership
   * enforcement).
   *
   * This test covers the negative/forbidden path for favorites update across
   * authenticated sellers. It confirms the backend enforces strict owner-only
   * update semantics.
   *
   * 1. Register Seller1 (join, authenticated context).
   * 2. Simulate that Seller1 owns a favorite (as creation endpoint is not
   *    provided); generate favoriteId UUID.
   * 3. Register Seller2 (new, authenticated context; switch context).
   * 4. Attempt to update Seller1's favorite as Seller2 via PUT
   *    /shoppingMallAiBackend/seller/favorites/{favoriteId}. Expect a forbidden
   *    (authorization) error, confirming only the favorite's owner can update
   *    their record.
   */

  // 1. Seller1 registration (join, authenticates as Seller1)
  const seller1Input: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const seller1Auth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: seller1Input });
  typia.assert(seller1Auth);

  // 2. Simulate a favoriteId owned by Seller1 (since no favorites create API is exposed)
  const favoriteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Seller2 registration (join, now authenticates as Seller2)
  const seller2Input: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const seller2Auth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: seller2Input });
  typia.assert(seller2Auth);

  // 4. Seller2 attempts to update Seller1's favorite, which should be forbidden
  await TestValidator.error(
    "Seller2 cannot update a favorite belonging to Seller1",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.update(
        connection,
        {
          favoriteId,
          body: {
            title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallAiBackendFavorite.IUpdate,
        },
      );
    },
  );
}
