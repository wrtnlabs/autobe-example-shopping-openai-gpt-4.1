import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_update_success_seller(
  connection: api.IConnection,
) {
  /**
   * End-to-end validation that a seller (after registration/auth) can update
   * their own favorite's metadata. Steps:
   *
   * 1. Register a new seller account (establishes context and authentication).
   * 2. Simulate an existing favorite belonging to this seller—in production this
   *    would require favorite creation, but no such endpoint exists, so use
   *    random valid data with seller id ownership.
   * 3. Update the favorite's group folder and snapshot title using the update API.
   * 4. Assert returned fields reflect updated data and maintain correct ownership.
   */

  // 1. Register seller (also sets authentication context)
  const sellerCreateInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerCreateInput,
  });
  typia.assert(sellerAuth);
  const sellerId = typia.assert(sellerAuth.seller.id);

  // 2. Simulate an existing favorite id (owned by this seller); since no creation API, just use a random UUID
  const favoriteId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update payload: change folder and title
  const updateInput: IShoppingMallAiBackendFavorite.IUpdate = {
    shopping_mall_ai_backend_favorite_folder_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
  };

  // 4. Perform the update
  const updatedFavorite =
    await api.functional.shoppingMallAiBackend.seller.favorites.update(
      connection,
      {
        favoriteId,
        body: updateInput,
      },
    );
  typia.assert(updatedFavorite);

  // 5. Assert updated fields and owner remain consistent
  TestValidator.equals(
    "updated folder id persists",
    updatedFavorite.shopping_mall_ai_backend_favorite_folder_id,
    updateInput.shopping_mall_ai_backend_favorite_folder_id,
  );
  TestValidator.equals(
    "updated title snapshot persists",
    updatedFavorite.title_snapshot,
    updateInput.title_snapshot,
  );
  TestValidator.equals(
    "unchanged owner remains correct",
    updatedFavorite.shopping_mall_ai_backend_customer_id,
    sellerId,
  );
}
