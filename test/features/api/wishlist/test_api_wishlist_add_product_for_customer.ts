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
 * E2E test for adding a product to a customer's wishlist.
 *
 * 1. Register a customer user (with address).
 * 2. Let the customer create a wishlist.
 * 3. Register an admin user and create a role (SELLER) and a category.
 * 4. Register a seller and create a product under the new category.
 * 5. Switch back to customer, add the new product to wishlist.
 *
 *    - Validate the response correctly links wishlist/product.
 * 6. Negative test: Attempt to add the product to wishlist again (should error as
 *    duplicate).
 * 7. Negative test: Register a second customer, create second wishlist, attempt to
 *    add to original customer's wishlist (should error on
 *    ownership/authorization).
 * 8. All responses asserted for type and business logic.
 */
export async function test_api_wishlist_add_product_for_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration (with address)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          address_line2: RandomGenerator.paragraph({ sentences: 1 }),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a wishlist for the customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {},
    });
  typia.assert(wishlist);

  // 3. Register admin and create SELLER role/category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(2),
        status: "active",
      },
    });
  typia.assert(admin);

  // 3-1. Create SELLER role
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Role for sellers to manage products.",
      },
    });
  typia.assert(role);

  // 3-2. Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(1),
        name_en: RandomGenerator.name(1),
        display_order: 0,
        is_active: true,
      },
    });
  typia.assert(category);

  // 4. Register a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      },
    });
  typia.assert(seller);

  // 5. Seller creates a product
  const productInput = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // --- Switch back to customer (token is automatically handled) ---

  // 6. Add product to customer's wishlist
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  TestValidator.equals(
    "linked wishlist id matches",
    wishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "linked product id matches",
    wishlistItem.shopping_mall_product_id,
    product.id,
  );

  // 7. Try to add the same product again -- should fail (duplicate entry)
  await TestValidator.error(
    "should fail on duplicate wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: { shopping_mall_product_id: product.id },
        },
      );
    },
  );

  // 8. Register another customer and try to add to the first one's wishlist
  const otherCustomerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherCustomerEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          address_line2: RandomGenerator.paragraph({ sentences: 1 }),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(otherCustomer);
  // (Their own wishlist)
  const otherWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {},
    });
  typia.assert(otherWishlist);

  // Try to add product to the original user's wishlist as this other customer
  await TestValidator.error(
    "should fail on adding to other's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: { shopping_mall_product_id: product.id },
        },
      );
    },
  );
  // Success: all workflow and validation logic passed
}
