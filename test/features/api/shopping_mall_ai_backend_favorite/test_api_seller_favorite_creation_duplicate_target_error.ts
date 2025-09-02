import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_seller_favorite_creation_duplicate_target_error(
  connection: api.IConnection,
) {
  /**
   * Test duplicate favorite creation for the same seller and target.
   *
   * This test verifies that the backend enforces uniqueness constraints for
   * seller favorites.
   *
   * 1. Register a seller and receive authentication (API: /auth/seller/join)
   * 2. As this seller, create a favorite for a target (API:
   *    /shoppingMallAiBackend/seller/favorites)
   * 3. Attempt to create another favorite for the same target_type/target_id for
   *    this seller
   * 4. Confirm that the duplicate creation is rejected with a business logic error
   *
   * Steps:
   *
   * - Seller registration and acquisition of sellerId for proper test context
   * - Construction and creation of a favorite with DTO-compliant minimal required
   *   payload
   * - Enforcement check by retrying with the same combination and expecting
   *   scenario-level duplication error
   */
  // Step 1: Register seller and prepare their auth context
  const sellerCreateInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuthResult = await api.functional.auth.seller.join(connection, {
    body: sellerCreateInput,
  });
  typia.assert(sellerAuthResult);
  const sellerId = sellerAuthResult.seller.id;

  // Step 2: Create a favorite for a specific target (simulate as a product, with random UUID for target_id)
  const favoriteInput: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: sellerId,
    target_type: "product",
    target_id_snapshot: typia.random<string & tags.Format<"uuid">>(),
  };
  const favorite =
    await api.functional.shoppingMallAiBackend.seller.favorites.create(
      connection,
      { body: favoriteInput },
    );
  typia.assert(favorite);
  TestValidator.equals(
    "Favorite creation matches input seller",
    favorite.shopping_mall_ai_backend_customer_id,
    sellerId,
  );
  TestValidator.equals(
    "Favorite target_type matches input",
    favorite.target_type,
    favoriteInput.target_type,
  );
  TestValidator.equals(
    "Favorite target_id_snapshot matches input",
    favorite.target_id_snapshot,
    favoriteInput.target_id_snapshot,
  );

  // Step 3: Attempt to create duplicate favorite for same target
  await TestValidator.error(
    "Duplicate favorite creation for same target_type/target_id should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.create(
        connection,
        { body: favoriteInput },
      );
    },
  );
}
