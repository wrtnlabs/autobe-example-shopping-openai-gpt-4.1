import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";

/**
 * Confirm that a customer can soft-delete their own favorite address and that
 * this favorite is removed from list/get operations, while being retained for
 * audit and compliance purposes. Also verify that unauthorized deletion
 * attempts are rejected.
 *
 * Steps:
 *
 * 1. Register customer1 and create a favorite address for them.
 * 2. Soft-delete customer1's favorite address.
 * 3. Attempt to soft-delete the same favorite address again (should be rejected,
 *    idempotency/audit).
 * 4. Register a second customer (customer2), attempt to delete customer1's
 *    favorite address (should be rejected).
 */
export async function test_api_favorite_address_removal_by_customer_owner(
  connection: api.IConnection,
) {
  // 1. Register customer1
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer1JoinBody = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer1JoinBody,
    });
  typia.assert(customer1);

  // 2. Create a favorite address for customer1
  // (simulate required address reference for favorite creation)
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const favoriteCreateBody = {
    shopping_mall_address_id: addressId,
    notification_enabled: true,
    batch_label: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallFavoriteAddress.ICreate;
  const favorite: IShoppingMallFavoriteAddress =
    await api.functional.shoppingMall.customer.favoriteAddresses.create(
      connection,
      {
        body: favoriteCreateBody,
      },
    );
  typia.assert(favorite);

  // 3. Customer1 soft-deletes their own favorite address
  await api.functional.shoppingMall.customer.favoriteAddresses.erase(
    connection,
    {
      favoriteAddressId: favorite.id,
    },
  );

  // 4. Attempt to soft-delete again as owner (should fail)
  await TestValidator.error("double-delete yields error", async () => {
    await api.functional.shoppingMall.customer.favoriteAddresses.erase(
      connection,
      {
        favoriteAddressId: favorite.id,
      },
    );
  });

  // 5. Register customer2 (attacker)
  const customer2JoinBody = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer2JoinBody,
    });
  typia.assert(customer2);

  // 6. Attempt to delete customer1's favorite address with customer2 (should fail)
  await TestValidator.error(
    "unauthorized customer cannot delete other's favorite address",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.erase(
        connection,
        {
          favoriteAddressId: favorite.id,
        },
      );
    },
  );
}
