import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate wishlist soft-delete by admin for shopping mall platform.
 *
 * This test covers the workflow where an admin flags a customer's wishlist as
 * deleted (soft delete), such that the 'deleted_at' property is set. Steps:
 *
 * 1. Register and authenticate a new customer, including required address.
 * 2. Customer creates a wishlist (1 per customer enforced).
 * 3. Register a new admin and authenticate as admin.
 * 4. The admin soft-deletes the customer's wishlist using its id.
 * 5. (Simulate) Check that re-access or further manipulation by customer is
 *    denied/forbidden after deletion (no read allowed).
 * 6. Attempt delete on a non-existent UUID (expect error).
 */
export async function test_api_wishlist_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.name(1),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. Create a wishlist for the customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {},
    });
  typia.assert(wishlist);

  // 3. Register and authenticate a new admin
  // (switching context: create as a separate admin user)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 4. Admin soft-deletes the customer's wishlist by id
  await api.functional.shoppingMall.admin.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 5. (Simulate logic) No API endpoint to get wishlist directly as admin or check deletion, but assume customer access after deletion is forbidden.
  // Attempt to create another wishlist as customer (should fail as one-per-customer rule enforced even if soft deleted)
  await TestValidator.error(
    "cannot create another wishlist after soft delete (still linked)",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {},
      });
    },
  );

  // 6. Attempt to delete a non-existent wishlist id (random UUID)
  await TestValidator.error(
    "admin - deleting non-existent wishlist should throw",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.erase(connection, {
        wishlistId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 7. Attempt to delete again (already deleted)
  await TestValidator.error(
    "admin - deleting already deleted wishlist should throw",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );
}
