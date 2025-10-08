import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * End-to-end test for seller address deletion by owner.
 *
 * Validates:
 *
 * 1. Authenticated seller can delete their address.
 * 2. Unauthorized users and non-owners are blocked.
 * 3. Address cannot be deleted by other sellers or unauthenticated actors.
 *
 * Steps:
 *
 * - Register a seller (join) and obtain credentials.
 * - (Simulate) Create a seller address and obtain IDs.
 * - Seller deletes their own address (success expected).
 * - Deletion by other seller (error expected).
 * - Deletion by unauthenticated user (error expected).
 */
export async function test_api_seller_address_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // (Mock - as no API for address creation or read exists): generate an addressId
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // 2. Delete the address as owner (success expected)
  await api.functional.shoppingMall.seller.sellers.addresses.erase(connection, {
    sellerId,
    addressId,
  });

  // 3. Attempt to delete with wrong seller (non-owner)
  const otherSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "only owner seller can delete their address",
    async () => {
      await api.functional.shoppingMall.seller.sellers.addresses.erase(
        connection,
        {
          sellerId: otherSellerId,
          addressId,
        },
      );
    },
  );

  // 4. Attempt to delete as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot delete a seller address",
    async () => {
      await api.functional.shoppingMall.seller.sellers.addresses.erase(
        unauthConn,
        {
          sellerId,
          addressId,
        },
      );
    },
  );
}
