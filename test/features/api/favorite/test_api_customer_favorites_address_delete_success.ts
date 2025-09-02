import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteAddress";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

/**
 * Test logical deletion (soft delete) of a favorited address from a
 * customer's favorite folder.
 *
 * This test covers the complete workflow:
 *
 * 1. Register a new customer account (establish auth context)
 * 2. Create a favorite folder for the customer
 * 3. Create a favorite entry of type 'address' within that folder (so we can
 *    add an address)
 * 4. Add a favorited address (simulate snapshot structure with realistic
 *    random data)
 * 5. Delete (soft-delete) the address from the favorite group
 * 6. Attempt to access/add the deleted favorite address again — expect a
 *    business error (as re-add or access is disallowed post-deletion)
 *
 * Validations include:
 *
 * - Deletion operation completes successfully (no error thrown)
 * - Attempting to re-favorite the same address (create with same favoriteId
 *   and customer) after deletion results in a failure (which is the
 *   expected business logic — e.g., 404 or conflict)
 *
 * This scenario ensures proper logical deletion and business rule
 * enforcement for user-owned favorite addresses.
 */
export async function test_api_customer_favorites_address_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer & establish authentication context
  const join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(join);
  const customerId = join.customer.id;

  // 2. Create a favorite folder for the customer
  const favoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate,
      },
    );
  typia.assert(favoriteFolder);

  // 3. Create a favorite entry of type 'address' in the folder
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_favorite_folder_id: favoriteFolder.id,
          title_snapshot: null,
          target_type: "address",
          target_id_snapshot: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallAiBackendFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // 4. Add a favorited address using folder/favorite context
  const favoriteAddress =
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.create(
      connection,
      {
        favoriteId: favorite.id,
        body: {
          shopping_mall_ai_backend_favorite_id: favorite.id,
          shopping_mall_ai_backend_customer_id: customerId,
          address_snapshot: JSON.stringify({
            addressLine1: RandomGenerator.paragraph({ sentences: 2 }),
            addressLine2: RandomGenerator.paragraph({ sentences: 1 }),
            city: RandomGenerator.name(1),
            postalCode: RandomGenerator.alphaNumeric(6),
            country: "South Korea",
          }),
        } satisfies IShoppingMallAiBackendFavoriteAddress.ICreate,
      },
    );
  typia.assert(favoriteAddress);

  // 5. Perform the deletion of the address from favorites (main scenario)
  await api.functional.shoppingMallAiBackend.customer.favorites.addresses.eraseFavoriteAddress(
    connection,
    {
      favoriteId: favorite.id,
      addressId: favoriteAddress.id,
    },
  );

  // 6. Attempt to add/access same favorited address again — must error (business rule)
  await TestValidator.error(
    "Deleted favorite address cannot be favorited again or accessed in the same folder",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.addresses.create(
        connection,
        {
          favoriteId: favorite.id,
          body: {
            shopping_mall_ai_backend_favorite_id: favorite.id,
            shopping_mall_ai_backend_customer_id: customerId,
            address_snapshot: favoriteAddress.address_snapshot,
          } satisfies IShoppingMallAiBackendFavoriteAddress.ICreate,
        },
      );
    },
  );
}
