import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate customer soft deletion (erase) of their own wishlist (shopping mall
 * scenario).
 *
 * Steps:
 *
 * 1. Register a customer with unique credentials and address info via
 *    /auth/customer/join (returns tokens and profile).
 * 2. Customer creates a wishlist using POST /shoppingMall/customer/wishlists.
 * 3. Customer deletes the wishlist with DELETE
 *    /shoppingMall/customer/wishlists/{wishlistId}.
 * 4. Attempt deleting the already deleted wishlist again - expect error.
 * 5. Attempt to delete a non-existent wishlist (random UUID) - expect error.
 *
 * Includes authentication round-trip and validates soft-deletion restrictions.
 */
export async function test_api_wishlist_soft_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 10,
      }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 10,
      }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);
  // No need to validate JWT, SDK manages connection state.

  // 2. Customer creates a wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    { body: {} },
  );
  typia.assert(wishlist);

  // 3. Customer deletes their wishlist
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 4. Attempt to delete again (should fail)
  await TestValidator.error(
    "delete already-deleted wishlist should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );

  // 5. Attempt to delete a non-existent wishlist
  await TestValidator.error(
    "delete non-existent wishlist should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
