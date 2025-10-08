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
 * Validates wishlist item deletion by an authenticated customer.
 *
 * This test covers:
 *
 * 1. Customer registration (with address)
 * 2. Category creation (needed for product)
 * 3. Seller role creation
 * 4. Product creation (by seller, using category)
 * 5. Wishlist creation for the customer
 * 6. Adding the product as a wishlist item
 * 7. Deleting the wishlist item successfully
 * 8. Verifying repeated deletion fails
 */
export async function test_api_wishlist_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // Register customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          address_line2: null,
          is_default: true,
        },
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Create category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        description_ko: null,
        description_en: null,
        parent_id: undefined,
        display_order: 1,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Create seller role
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Can list and manage products",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(sellerRole);

  // Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: customer.id as string & tags.Format<"uuid">,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 7,
          wordMin: 3,
          wordMax: 10,
        }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Create wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // Add product to wishlist
  const wishlistItem: IShoppingMallWishlistItem =
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

  // Delete wishlist item
  await api.functional.shoppingMall.customer.wishlists.wishlistItems.erase(
    connection,
    {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItem.id,
    },
  );

  // Attempt to delete again (should result in error)
  await TestValidator.error("repeated deletion fails", async () => {
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.erase(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
      },
    );
  });
}
