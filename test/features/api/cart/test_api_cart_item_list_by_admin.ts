import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";

/**
 * Validates that administrator users can retrieve any customer's cart items for
 * operations and monitoring.
 *
 * This test exercises the following workflow:
 *
 * 1. Register a new admin account (receives admin token for subsequent requests).
 * 2. Register a new customer account with random info and associate to a random
 *    channel.
 * 3. Register a new product and product variant as a seller for the customer
 *    cart's channel/section/category.
 * 4. As customer, create a new cart for the channel/section, and add at least one
 *    item (with a variant) to the cart.
 * 5. As admin, access the items in the cart using `admin.carts.items.index` API
 *    and verify the result includes all information on items, products, and
 *    variants as per privacy rules.
 * 6. Confirm business logic: retrieved cart item data matches what was added,
 *    including option snapshots, variant, and quantity.
 * 7. Test pagination by requesting with small limit and verify correct slicing and
 *    pagination output.
 * 8. Attempt to access a non-existent cartId and expect error.
 * 9. Create an empty cart (or remove items from an existing cart), and test admin
 *    item-list returns empty data without error (if permitted by API).
 */
export async function test_api_cart_item_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register customer & get channel info
  const customerEmail = typia.random<string & tags.Format<"email">>();
  // Create random ids for channel/section/category (simulate available catalog)
  const shopping_mall_channel_id = typia.random<string & tags.Format<"uuid">>();
  const shopping_mall_section_id = typia.random<string & tags.Format<"uuid">>();
  const shopping_mall_category_id = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id,
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Register product as seller
  // Use admin session to register seller-product (assume admin has relevant access for test)
  // Use unique codes and channel-section-category IDs from above
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // simulate arbitrary seller per product
        shopping_mall_channel_id,
        shopping_mall_section_id,
        shopping_mall_category_id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        business_status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  // Create variant for product
  const SKU_CODE = RandomGenerator.alphaNumeric(8);
  const OPTION_HASH = RandomGenerator.alphaNumeric(16); // Snapshotted value
  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: SKU_CODE,
          bar_code: null,
          option_values_hash: OPTION_HASH,
          price: 19900,
          stock_quantity: 100,
          weight: 450,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 4. As customer, create cart and add item
  // Switch session: use customer token
  const customerConn: api.IConnection = { ...connection };
  customerConn.headers = { Authorization: customer.token.access };
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(customerConn, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id,
        shopping_mall_section_id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // Add item (with variant, snapshot)
  const option_snapshot = JSON.stringify({
    hash: OPTION_HASH,
    note: "selected options for variant",
  });
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConn,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_variant_id: variant.id,
          quantity: 2,
          option_snapshot,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 5. As admin, retrieve list of items in the cart
  // Switch back to admin connection
  connection.headers = { Authorization: admin.token.access };
  const cartItemList: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.admin.carts.items.index(connection, {
      cartId: cart.id,
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(cartItemList);
  // Assert item list is correct
  TestValidator.predicate(
    "cart items list includes created item",
    cartItemList.data.some((item) => item.id === cartItem.id),
  );
  // Check fields for privacy/business logic
  const found = cartItemList.data.find((it) => it.id === cartItem.id);
  if (found) {
    TestValidator.equals(
      "correct product in cart item",
      found.shopping_mall_product_id,
      product.id,
    );
    TestValidator.equals(
      "correct variant in cart item",
      found.shopping_mall_product_variant_id,
      variant.id,
    );
    TestValidator.equals("quantity matches", found.quantity, 2);
    TestValidator.equals(
      "option snapshot matches",
      found.option_snapshot,
      option_snapshot,
    );
  } else {
    throw new Error("Cart item not found in admin list");
  }

  // 6. Test pagination (limit 1)
  const paginationList: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.admin.carts.items.index(connection, {
      cartId: cart.id,
      body: { limit: 1, page: 1 } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(paginationList);
  TestValidator.equals(
    "pagination limit is 1",
    paginationList.pagination.limit,
    1,
  );

  // 7. Test error on non-existent cart
  await TestValidator.error(
    "admin accessing non-existent cart returns error",
    async () => {
      await api.functional.shoppingMall.admin.carts.items.index(connection, {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IShoppingMallCartItem.IRequest,
      });
    },
  );

  // 8. Test item list for empty cart
  // Create empty cart for customer
  const emptyCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(customerConn, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id,
        shopping_mall_section_id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(emptyCart);
  connection.headers = { Authorization: admin.token.access };
  const emptyCartList: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.admin.carts.items.index(connection, {
      cartId: emptyCart.id,
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(emptyCartList);
  TestValidator.equals(
    "empty cart returns no items",
    emptyCartList.data.length,
    0,
  );
}
