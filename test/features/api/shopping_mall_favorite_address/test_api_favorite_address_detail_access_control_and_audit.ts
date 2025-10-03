import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";

/**
 * Validate access control and auditability for favorite address detail
 * retrieval.
 *
 * 1. Register as customer 1 and create a favorite address.
 * 2. Retrieve favorite address detail as customer 1; verify all data fields are
 *    correct and audit fields present, deleted_at is null.
 * 3. Register as customer 2 (different channel/email); attempt to retrieve
 *    customer 1's favorite address, expect forbidden/not found.
 * 4. (edge) If possible, simulate favorite deletion; try retrieval as original
 *    owner, expect not found.
 * 5. In all error/denied cases, validate error is thrown and sensitive fields are
 *    not leaked.
 */
export async function test_api_favorite_address_detail_access_control_and_audit(
  connection: api.IConnection,
) {
  // 1. Register customer 1
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const joinBody1 = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_pwd123",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: joinBody1,
  });
  typia.assert(customer1);

  // 2. Create favorite address for customer 1
  const favoriteAddressBody = {
    shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
    notification_enabled: true,
    batch_label: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallFavoriteAddress.ICreate;
  const favorite =
    await api.functional.shoppingMall.customer.favoriteAddresses.create(
      connection,
      { body: favoriteAddressBody },
    );
  typia.assert(favorite);

  // 3. Retrieve as owner
  const favoriteDetail =
    await api.functional.shoppingMall.customer.favoriteAddresses.at(
      connection,
      { favoriteAddressId: favorite.id },
    );
  typia.assert(favoriteDetail);
  TestValidator.equals(
    "favorite address id matches",
    favoriteDetail.id,
    favorite.id,
  );
  TestValidator.equals(
    "favorite snapshot id matches",
    favoriteDetail.shopping_mall_favorite_snapshot_id,
    favorite.shopping_mall_favorite_snapshot_id,
  );
  TestValidator.equals(
    "notification enabled matches",
    favoriteDetail.notification_enabled,
    favorite.notification_enabled,
  );
  TestValidator.equals(
    "batch label matches",
    favoriteDetail.batch_label,
    favorite.batch_label,
  );
  TestValidator.equals(
    "deleted_at should be null",
    favoriteDetail.deleted_at,
    null,
  );

  // 4. Register a second customer
  const channelId2 = typia.random<string & tags.Format<"uuid">>();
  const joinBody2 = {
    shopping_mall_channel_id: channelId2,
    email: typia.random<string & tags.Format<"email">>(),
    password: "test_pwd456",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: joinBody2,
  });
  typia.assert(customer2);

  // 5. Attempt forbidden access as customer 2
  await TestValidator.error(
    "cannot access another's favorite address",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.at(
        connection,
        { favoriteAddressId: favorite.id },
      );
    },
  );

  // 6. Not found for non-existent favorite address id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not found for non-existent favorite address id",
    async () => {
      await api.functional.shoppingMall.customer.favoriteAddresses.at(
        connection,
        { favoriteAddressId: nonExistentId },
      );
    },
  );
}
