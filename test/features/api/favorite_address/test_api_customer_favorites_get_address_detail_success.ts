import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteAddress";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_customer_favorites_get_address_detail_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for: Get detailed snapshot info for a specific favorited address.
   *
   * Test process:
   *
   * 1. Customer registers and becomes authenticated.
   * 2. The customer creates a personal favorite folder.
   * 3. The customer creates a favorite record (with target_type 'address')
   *    associated with this folder.
   * 4. The customer adds an address as a favorite in the folder (with an explicit
   *    address_snapshot).
   * 5. Retrieve the favorited address details using GET and validate all key
   *    properties.
   * 6. Edge: Assert that accessing with an invalid favoriteId or addressId is
   *    rejected.
   */

  // 1. Customer Registration (auth/customer/join)
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
  const customerId = customerJoin.customer.id;

  // 2. Create Favorite Folder
  const folder: IShoppingMallAiBackendFavoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 12,
          }),
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(folder);

  // 3. Create Favorite record for 'address' target (in folder)
  const favorite: IShoppingMallAiBackendFavorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_favorite_folder_id: folder.id,
          title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
          target_type: "address",
          target_id_snapshot: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 4. Add a favorited address record to the folder/favorite
  const address_snapshot = JSON.stringify({
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    address_line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    zip_code: RandomGenerator.alphaNumeric(5),
    country: "South Korea",
  });
  const favAddress: IShoppingMallAiBackendFavoriteAddress =
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.create(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favorite.id,
          shopping_mall_ai_backend_customer_id: customerId,
          address_snapshot,
        } satisfies IShoppingMallAiBackendFavoriteAddress.ICreate,
      },
    );
  typia.assert(favAddress);

  // 5. Retrieve favorited address details for this favorite/address
  const addressDetails: IShoppingMallAiBackendFavoriteAddress =
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.at(
      connection,
      {
        favoriteId: favorite.id,
        addressId: favAddress.id,
      },
    );
  typia.assert(addressDetails);

  // Validate core response fields
  TestValidator.equals(
    "favorite address ID matches",
    addressDetails.id,
    favAddress.id,
  );
  TestValidator.equals(
    "favorite address favoriteId matches",
    addressDetails.shopping_mall_ai_backend_favorite_id,
    favorite.id,
  );
  TestValidator.equals(
    "favorite address customerId matches",
    addressDetails.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "favorite address snapshot matches",
    addressDetails.address_snapshot,
    address_snapshot,
  );
  TestValidator.predicate(
    "favorite address created_at exists",
    typeof addressDetails.created_at === "string" &&
      !!addressDetails.created_at.length,
  );

  // 6. Edge case: Try to retrieve with invalid favoriteId/addressId
  await TestValidator.error("should reject invalid favoriteId", async () => {
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.at(
      connection,
      {
        favoriteId: typia.random<string & tags.Format<"uuid">>(),
        addressId: favAddress.id,
      },
    );
  });

  await TestValidator.error("should reject invalid addressId", async () => {
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.at(
      connection,
      {
        favoriteId: favorite.id,
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
