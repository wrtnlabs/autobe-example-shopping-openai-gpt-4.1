import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate the update of a wishlist item (ownership and resource existence).
 *
 * This test walks through registering a customer, category and role setup,
 * product creation, customer wishlist creation, wishlist item creation, and
 * then updating the wishlist item (which has no metadata fields as of current
 * schema; update is a no-op). The test then verifies update works for the
 * owner, but generates errors for non-owner or non-existent wishlist/item
 * cases.
 */
export async function test_api_wishlist_item_update_ownership_and_metadata(
  connection: api.IConnection,
) {
  // 1. Create a new customer and log in
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 20,
        }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;

  // 2. Platform admin creates a category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Platform admin creates a seller role
  const sellerRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: `SELLER_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(sellerRole);

  // 4. Platform admin creates a product associated to the above category and seller
  // For test, simulate "seller person" as a new UUID (since seller auth flow is not covered in DTOs here)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: undefined,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Customer creates a wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {},
    },
  );
  typia.assert(wishlist);

  // 6. Customer adds product to wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_id: product.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);

  // 7. Customer updates the wishlist item - as update DTO has no fields,
  // so this checks only ownership/access is enforced
  const updatedWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.update(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
        body: {} satisfies IShoppingMallWishlistItem.IUpdate,
      },
    );
  typia.assert(updatedWishlistItem);
  TestValidator.equals(
    "wishlistItemId remains the same after update",
    updatedWishlistItem.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "wishlistId remains the same after update",
    updatedWishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "productId remains the same after update",
    updatedWishlistItem.shopping_mall_product_id,
    product.id,
  );

  // 8. Error: Attempt to update a wishlist item in another (random) wishlist (ownership violation)
  await TestValidator.error(
    "should error on updating wishlist item in non-owned wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.update(
        connection,
        {
          wishlistId: typia.random<string & tags.Format<"uuid">>(), // non-existent or not the customer's wishlist
          wishlistItemId: wishlistItem.id,
          body: {} satisfies IShoppingMallWishlistItem.IUpdate,
        },
      );
    },
  );
  // 9. Error: Attempt to update a non-existent wishlist item in the real wishlist
  await TestValidator.error(
    "should error on updating non-existent wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.update(
        connection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IShoppingMallWishlistItem.IUpdate,
        },
      );
    },
  );
}
