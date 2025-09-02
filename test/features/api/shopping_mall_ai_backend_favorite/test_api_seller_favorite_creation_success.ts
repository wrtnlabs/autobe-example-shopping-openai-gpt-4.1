import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

/**
 * Validate successful favorite creation by a seller.
 *
 * This test verifies that a seller can create a favorite entity in the
 * system according to business requirements:
 *
 * 1. Register a new seller using the join endpoint (POST /auth/seller/join) to
 *    establish authentication and extract a seller ID.
 * 2. Create a new favorite using the seller's authentication, providing
 *    required fields (shopping_mall_ai_backend_customer_id, target_type,
 *    target_id_snapshot) and realistic test values.
 * 3. Check that the favorite creation response contains correct linkages
 *    (seller/customer ID), target snapshot data, and system-generated
 *    UUID/timestamps in ISO format.
 * 4. Assert business uniqueness: attempt to create the same favorite twice
 *    (same customer/target_type/target_id_snapshot) and check that the
 *    system enforces the unique constraint by producing an error.
 */
export async function test_api_seller_favorite_creation_success(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain full authentication context
  const sellerCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateInput,
    });
  typia.assert(sellerAuth);
  const sellerId: string & tags.Format<"uuid"> = typia.assert(
    sellerAuth.seller.id,
  );

  // 2. Prepare favorite creation input with required/optional fields
  const targetTypes = ["product", "address", "inquiry"] as const;
  const favoriteCreateInput: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: sellerId,
    target_type: RandomGenerator.pick(targetTypes),
    target_id_snapshot: typia.random<string & tags.Format<"uuid">>(),
    title_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_ai_backend_favorite_folder_id: null,
  } satisfies IShoppingMallAiBackendFavorite.ICreate;

  // 3. Create the favorite and validate core business output
  const favorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.seller.favorites.create(
      connection,
      { body: favoriteCreateInput },
    );
  typia.assert(favorite);

  // Validate linkage to the correct seller/customer
  TestValidator.equals(
    "favorite is linked to joined seller account",
    favorite.shopping_mall_ai_backend_customer_id,
    sellerId,
  );
  // Validate target_type and target_id_snapshot round-trip
  TestValidator.equals(
    "favorite target_type matches input",
    favorite.target_type,
    favoriteCreateInput.target_type,
  );
  TestValidator.equals(
    "favorite target_id_snapshot matches input",
    favorite.target_id_snapshot,
    favoriteCreateInput.target_id_snapshot,
  );
  // Validate UUID and timestamps with typia.assert for strong runtime guarantee
  typia.assert<string & tags.Format<"uuid">>(favorite.id);
  typia.assert<string & tags.Format<"date-time">>(favorite.created_at);
  typia.assert<string & tags.Format<"date-time">>(favorite.updated_at);
  // Validate optional fields are preserved (null folder, correct title snapshot)
  TestValidator.equals(
    "favorite folder_id should be null",
    favorite.shopping_mall_ai_backend_favorite_folder_id,
    null,
  );
  TestValidator.equals(
    "favorite title_snapshot matches input",
    favorite.title_snapshot,
    favoriteCreateInput.title_snapshot,
  );

  // 4. Uniqueness constraint: attempt duplicate favorite, expect business error
  await TestValidator.error(
    "cannot create duplicate favorite for same seller/target_type/target_id_snapshot",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.create(
        connection,
        { body: favoriteCreateInput },
      );
    },
  );
}
