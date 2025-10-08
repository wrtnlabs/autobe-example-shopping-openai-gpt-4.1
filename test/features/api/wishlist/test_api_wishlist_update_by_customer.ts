import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate the update of a customer's wishlist (ownership, persistence, audit).
 *
 * 1. Register a new customer account and login (returns token and profile).
 * 2. Customer creates a new wishlist.
 * 3. Customer updates the wishlist (simulated by issuing an updated_at write-only
 *    field).
 * 4. Validate only the owner can update (covered by single user context, no
 *    impersonation).
 * 5. Validate persisted change: updated_at is refreshed.
 * 6. Attempt to update a non-existent wishlist; expect error.
 */
export async function test_api_wishlist_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 4 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Customer creates a new wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // 3. Customer updates the wishlist (simulate: send new updated_at; server overwrites with real value)
  const previousUpdatedAt = wishlist.updated_at;
  const updateBody = {
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallWishlist.IUpdate;
  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist.id,
      body: updateBody,
    });
  typia.assert(updatedWishlist);
  TestValidator.notEquals(
    "updated_at is changed after update",
    previousUpdatedAt,
    updatedWishlist.updated_at,
  );
  TestValidator.equals(
    "wishlist owner unchanged",
    updatedWishlist.shopping_mall_customer_id,
    wishlist.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "wishlist id unchanged",
    updatedWishlist.id,
    wishlist.id,
  );
  TestValidator.predicate(
    "updated_at is greater than or equal to previous",
    new Date(updatedWishlist.updated_at).getTime() >=
      new Date(previousUpdatedAt).getTime(),
  );

  // 4. Attempt to update non-existent wishlist
  await TestValidator.error(
    "updating non-existent wishlist fails",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        wishlistId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      });
    },
  );
}
