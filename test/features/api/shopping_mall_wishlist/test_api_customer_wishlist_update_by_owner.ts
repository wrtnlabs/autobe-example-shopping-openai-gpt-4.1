import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test updating wishlist details by the owner customer.
 *
 * This test validates that a customer can update only their own wishlist. It
 * ensures:
 *
 * - The customer registers and logs in, then creates a wishlist.
 * - The customer successfully updates the wishlist (triggers updated_at change).
 * - Only the owner can update—update is not allowed by other customers (error
 *   expected).
 * - Safeguards: update is not allowed if wishlist is deleted.
 * - All business invariants are preserved.
 */
export async function test_api_customer_wishlist_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email: string = typia.random<string & tags.Format<"email">>();
  const full_name: string = RandomGenerator.name();
  const phone: string = RandomGenerator.mobile();
  const address: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  };
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(10),
      full_name,
      phone,
      address,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Customer creates a wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 3. Perform update by owner (should succeed)
  const initialUpdatedAt = wishlist.updated_at;
  // Random future ISO date for updated_at
  const updated_at = new Date(Date.now() + 60000).toISOString();
  const updated = await api.functional.shoppingMall.customer.wishlists.update(
    connection,
    {
      wishlistId: wishlist.id,
      body: { updated_at } satisfies IShoppingMallWishlist.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.notEquals(
    "wishlist updated_at changed",
    updated.updated_at,
    initialUpdatedAt,
  );
  // Confirm other invariants: customer association unchanged
  TestValidator.equals(
    "wishlist owner unchanged",
    updated.shopping_mall_customer_id,
    wishlist.shopping_mall_customer_id,
  );
  // Confirm id is unchanged
  TestValidator.equals("wishlist id unchanged", updated.id, wishlist.id);

  // 4. Register a different customer (attacker)
  const attackerEmail: string = typia.random<string & tags.Format<"email">>();
  const attacker = await api.functional.auth.customer.join(connection, {
    body: {
      email: attackerEmail,
      password: RandomGenerator.alphaNumeric(10),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(attacker);

  // 5. Attacker (different customer) attempts to update our wishlist (should fail)
  await TestValidator.error(
    "other customer should not be allowed to update this wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        wishlistId: wishlist.id,
        body: {
          updated_at: new Date(Date.now() + 120000).toISOString(),
        } satisfies IShoppingMallWishlist.IUpdate,
      });
    },
  );
  // 6. (No wishlist deletion API to test deleted case, so omit it)
}
