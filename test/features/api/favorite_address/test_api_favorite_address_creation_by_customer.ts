import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";

/**
 * Verify that an authenticated customer can add a new favorite address and
 * business rules are enforced:
 *
 * 1. Register a customer account
 * 2. Construct a favorite address creation request referencing an address ID
 *    presuming it belongs to this customer
 * 3. Create favorite address using the /shoppingMall/customer/favoriteAddresses
 *    POST endpoint
 * 4. Check returned object matches submitted data (address ref, batch label,
 *    notification setting)
 * 5. Ensure a duplicate attempt for the same address fails (uniqueness per
 *    customer)
 * 6. Register a second customer and try to favorite the first customer's address
 *    (should fail: permission error)
 */
export async function test_api_favorite_address_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register first customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email: customerEmail,
    password: "passw0rd!",
    name: customerName,
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);
  TestValidator.equals(
    "match channel id",
    customer.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals("match email", customer.email, customerEmail);
  TestValidator.equals("match name", customer.name, customerName);

  // 2. Generate address ID that is assumed to belong to this customer (simulate, since no address creation API present)
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create favorite address
  const batchLabel = RandomGenerator.paragraph({ sentences: 2 });
  const favoriteCreateBody = {
    shopping_mall_address_id: addressId,
    notification_enabled: true,
    batch_label: batchLabel,
  } satisfies IShoppingMallFavoriteAddress.ICreate;
  const createdFavorite: IShoppingMallFavoriteAddress =
    await api.functional.shoppingMall.customer.favoriteAddresses.create(
      connection,
      { body: favoriteCreateBody },
    );
  typia.assert(createdFavorite);
  TestValidator.equals(
    "favorite address id matches input",
    createdFavorite.shopping_mall_address_id,
    addressId,
  );
  TestValidator.equals(
    "favorite notification matches",
    createdFavorite.notification_enabled,
    true,
  );
  TestValidator.equals(
    "favorite batch label matches",
    createdFavorite.batch_label,
    batchLabel,
  );
  TestValidator.equals(
    "favorited is linked to customer",
    createdFavorite.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof createdFavorite.created_at === "string" &&
      !!createdFavorite.created_at.length,
  );

  // 4. Ensure uniqueness: duplicate favorite fails
  await TestValidator.error(
    "duplicate favoriting same address should fail",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.create(
        connection,
        { body: favoriteCreateBody },
      );
    },
  );

  // 5. Register a second customer
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherJoinBody = {
    shopping_mall_channel_id: channelId,
    email: otherEmail,
    password: "diffPass!23",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherJoinBody,
    });
  typia.assert(otherCustomer);

  // 6. Switch to second customer: try to favorite the first customer's address (should fail: permission denied)
  await TestValidator.error(
    "favoriting address not belonging to own customer should fail",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.create(
        connection,
        {
          body: {
            shopping_mall_address_id: addressId,
            notification_enabled: false,
            batch_label: null,
          } satisfies IShoppingMallFavoriteAddress.ICreate,
        },
      );
    },
  );
}
