import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate customer retrieval of their own wishlist item details, test linkage
 * and access control.
 *
 * 1. Register a new admin and set role/category
 * 2. Register a new seller
 * 3. Register a new customer
 * 4. Admin creates seller role
 * 5. Admin creates category
 * 6. Seller creates a product under category
 * 7. Customer creates own wishlist
 * 8. Customer adds the created product to wishlist
 * 9. Customer retrieves the wishlist item detail
 * 10. Assert ownership, field integrity, and correct linkages
 * 11. Unauthorized access attempt by another (fake) customer should yield error
 */
export async function test_api_wishlist_item_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register admin (to create role/category)
  const adminOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminOutput);

  // Step 2: Admin creates 'SELLER' role (required for seller management)
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Can register products and manage own sales",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // Step 3: Admin creates product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Register seller
  const sellerOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerOutput);

  // Step 5: Seller creates a product in this category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerOutput.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 4,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 10,
        }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 6: Register customer
  const address: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    is_default: true,
  };
  const customerOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerOutput);

  // Step 7: Customer creates own wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // Step 8: Customer adds new product to wishlist
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

  // Step 9: Customer retrieves the wishlist item detail
  const itemDetail: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.at(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(itemDetail);
  TestValidator.equals(
    "wishlistId should match",
    itemDetail.shopping_mall_wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "productId should match",
    itemDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "wishlistItemId should match",
    itemDetail.id,
    wishlistItem.id,
  );
  TestValidator.predicate(
    "created_at & updated_at are non-empty",
    !!itemDetail.created_at && !!itemDetail.updated_at,
  );

  // Step 10: Unauthorized - attempt to access with another customer
  const fakeCustomerOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(fakeCustomerOutput);
  await TestValidator.error(
    "other customer cannot access someone else's wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.at(
        connection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem.id,
        },
      );
    },
  );
}
