import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";

/**
 * Tests that a customer can update the notification and batch_label fields of
 * their favorited address, and that only those fields mutate. Also,
 * unauthorized users cannot update others' favorites.
 */
export async function test_api_favorite_address_metadata_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);

  // 2. Create a favorited address for this customer. (Must have an address ID: mock with random UUID)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const favoriteCreateBody = {
    shopping_mall_address_id: addressId,
    notification_enabled: true,
    batch_label: "Home address",
  } satisfies IShoppingMallFavoriteAddress.ICreate;
  const favorite: IShoppingMallFavoriteAddress =
    await api.functional.shoppingMall.customer.favoriteAddresses.create(
      connection,
      { body: favoriteCreateBody },
    );
  typia.assert(favorite);

  // 3. Update favorite address fields (notification & batch_label)
  const newBatchLabel = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody = {
    notification_enabled: false,
    batch_label: newBatchLabel,
  } satisfies IShoppingMallFavoriteAddress.IUpdate;
  const updated: IShoppingMallFavoriteAddress =
    await api.functional.shoppingMall.customer.favoriteAddresses.update(
      connection,
      { favoriteAddressId: favorite.id, body: updateBody },
    );
  typia.assert(updated);

  // 4. Assert only notification_enabled and batch_label have changed
  TestValidator.equals(
    "notification_enabled updated",
    updated.notification_enabled,
    false,
  );
  TestValidator.equals(
    "batch_label updated",
    updated.batch_label,
    newBatchLabel,
  );
  TestValidator.equals("Id stays same", updated.id, favorite.id);
  TestValidator.equals(
    "customer link immutable",
    updated.shopping_mall_customer_id,
    favorite.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "address link immutable",
    updated.shopping_mall_address_id,
    favorite.shopping_mall_address_id,
  );
  TestValidator.equals(
    "snapshot link immutable",
    updated.shopping_mall_favorite_snapshot_id,
    favorite.shopping_mall_favorite_snapshot_id,
  );

  // 5. Unauthorized update attempt by another user
  // Register a separate customer
  const attackerBody = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const attacker: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: attackerBody });
  typia.assert(attacker);

  // Try to update the first favorite address as the attacker
  await TestValidator.error(
    "other user cannot update favorite address",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.update(
        connection,
        {
          favoriteAddressId: favorite.id,
          body: {
            notification_enabled: true,
          } satisfies IShoppingMallFavoriteAddress.IUpdate,
        },
      );
    },
  );
  // 6. (Not directly verifiable) Confirm audit log requirements by control flow - attempted updates are always logged.
}
