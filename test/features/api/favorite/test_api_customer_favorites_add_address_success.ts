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
 * Test scenario: Successful favoriting of a new address in an existing
 * favorite folder (shopping mall AI backend).
 *
 * Steps:
 *
 * 1. Register a customer, obtaining the authentication token in
 *    connection.headers automatically.
 * 2. Customer creates a favorite folder/group.
 * 3. Customer creates a favorite entity (base favorite for "address").
 * 4. Customer adds a new address as a favorite in the chosen group/folder.
 * 5. Validate that the address is favorited and all audit/snapshot fields are
 *    correct.
 * 6. Business logic: Attempt to favorite the same address again in the same
 *    folder—expect duplication error (business rule enforcement).
 *
 * Only applicable/implementable edge cases regarding duplication are
 * included. Address snapshot is accepted as a stringified JSON object with
 * realistic test address. No invented DTO props or API calls.
 */
export async function test_api_customer_favorites_add_address_success(
  connection: api.IConnection,
) {
  // 1. Register customer and set Authorization token in connection.headers automatically
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;

  // 2. Create a favorite folder/group
  const folderInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate;
  const folder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      { body: folderInput },
    );
  typia.assert(folder);

  // 3. Create a favorite entity (using the folder as parent group)
  const favoriteInput = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_favorite_folder_id: folder.id,
    target_type: "address",
    title_snapshot: null,
    target_id_snapshot: null,
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: favoriteInput },
    );
  typia.assert(favorite);

  // 4. Add an address as a favorite to that group/folder
  const addressSnapshot = JSON.stringify({
    country: "South Korea",
    city: "Seoul",
    district: "Gangnam-gu",
    street: RandomGenerator.paragraph({ sentences: 2 }),
    postalCode: "06130",
    recipient: RandomGenerator.name(),
    mobile: RandomGenerator.mobile(),
  });
  const addressInput = {
    shopping_mall_ai_backend_favorite_id: favorite.id,
    shopping_mall_ai_backend_customer_id: customer.id,
    address_snapshot: addressSnapshot,
  } satisfies IShoppingMallAiBackendFavoriteAddress.ICreate;
  const addressFavored =
    await api.functional.shoppingMallAiBackend.customer.favorites.addresses.create(
      connection,
      { favoriteId: favorite.id, body: addressInput },
    );
  typia.assert(addressFavored);
  TestValidator.equals(
    "favorite address customer id correct",
    addressFavored.shopping_mall_ai_backend_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "favorite address favorite id correct",
    addressFavored.shopping_mall_ai_backend_favorite_id,
    favorite.id,
  );
  TestValidator.predicate(
    "favorite address has snapshot",
    typeof addressFavored.address_snapshot === "string" &&
      addressFavored.address_snapshot.length > 0,
  );
  TestValidator.predicate(
    "favorite address creation timestamp exists",
    typeof addressFavored.created_at === "string" &&
      addressFavored.created_at.length > 0,
  );

  // 5. Try to add the same address again and expect duplication error (business rule)
  await TestValidator.error(
    "cannot favorite same address twice in the same folder",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.addresses.create(
        connection,
        { favoriteId: favorite.id, body: addressInput },
      );
    },
  );
}
