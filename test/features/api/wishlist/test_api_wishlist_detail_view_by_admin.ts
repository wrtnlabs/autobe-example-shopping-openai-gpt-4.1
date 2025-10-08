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
 * Validate that an admin can retrieve any user's wishlist detail by wishlistId
 * and that admins have full audit visibility.
 *
 * 1. Register a new admin.
 * 2. Register a new customer.
 * 3. Customer creates their wishlist.
 * 4. Switch to admin account and retrieve the wishlist by ID.
 * 5. Validate the response fields: id, shopping_mall_customer_id, created_at,
 *    updated_at.
 * 6. Attempt to retrieve a wishlist with a random (non-existent) UUID and confirm
 *    error handling.
 */
export async function test_api_wishlist_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SuperSecret123!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a new customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPWD123!",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create a wishlist as the customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // Switch to admin account
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SuperSecret123!",
      full_name: admin.full_name,
      status: admin.status,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // 4. Retrieve wishlist detail by admin
  const fetched: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(fetched);
  TestValidator.equals("wishlist id matches", fetched.id, wishlist.id);
  TestValidator.equals(
    "customer id matches",
    fetched.shopping_mall_customer_id,
    wishlist.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "created_at matches",
    fetched.created_at,
    wishlist.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    fetched.updated_at,
    wishlist.updated_at,
  );

  // 5. Retrieve non-existent wishlist -- expect error
  const randomWishlistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot retrieve non-existent wishlist",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.at(connection, {
        wishlistId: randomWishlistId,
      });
    },
  );
}
