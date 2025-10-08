import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate retrieval of wishlist items (empty case, filtering, pagination, and
 * unauthorized access).
 *
 * Business context: Ensure that an authenticated customer can list wishlist
 * items from their own wishlist using advanced options (filter, pagination,
 * sort), and that unauthorized access to other wishlists is blocked.
 *
 * 1. Register and login a new customer (with default address)
 * 2. Create a wishlist for this customer (guaranteed one per customer)
 * 3. Try to retrieve all wishlist items (should be empty as no add endpoint is
 *    available)
 * 4. Test advanced filtering, pagination, and ordering options (all results empty)
 * 5. Validate pagination meta
 * 6. Try to list items from a wishlist not owned by the customer and expect access
 *    denied
 */
export async function test_api_customer_wishlist_items_listing(
  connection: api.IConnection,
) {
  // 1. Register and login new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(auth);

  // 2. Create a wishlist for the customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {},
    });
  typia.assert(wishlist);

  // 3. Retrieve wishlist items for this wishlist (should be empty)
  const baseFilter = {} satisfies IShoppingMallWishlistItem.IRequest;
  const page1: IPageIShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
      connection,
      { wishlistId: wishlist.id, body: baseFilter },
    );
  typia.assert(page1);
  TestValidator.equals(
    "wishlist items is empty after creation",
    page1.data.length,
    0,
  );
  TestValidator.equals(
    "pagination starts at page 1 (api may use 1-based or 0-based)",
    page1.pagination.current,
    1,
  );

  // 4. Advanced filter: page, limit, added_before/after, product_name, sort
  const filters: IShoppingMallWishlistItem.IRequest[] = [
    { page: 1, limit: 2, sort: "created_at-desc" },
    { page: 2, limit: 2, sort: "created_at-asc" },
    { product_name: "SampleName", limit: 10 },
    { added_before: new Date().toISOString(), page: 1 },
    { added_after: new Date(Date.now() - 10000).toISOString() },
  ];
  for (const filter of filters) {
    const result: IPageIShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
        connection,
        { wishlistId: wishlist.id, body: filter },
      );
    typia.assert(result);
    TestValidator.equals(
      "filtered result empty (no items)",
      result.data.length,
      0,
    );
    TestValidator.equals(
      "pagination reflects limit",
      result.pagination.limit,
      filter.limit ?? 20,
    );
  }

  // 5. Attempt to access wishlist items of a random (not owned) wishlist
  await TestValidator.error("access denied for foreign wishlist", async () => {
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
      connection,
      {
        wishlistId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}
