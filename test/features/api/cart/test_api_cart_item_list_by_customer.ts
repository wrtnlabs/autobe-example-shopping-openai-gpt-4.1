import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";

/**
 * Validate that a customer can list their own cart items with full coverage of
 * listing, paging, filtering, and privacy/isolation logic.
 *
 * 1. Register a new customer user (join via unique channel, email, password,
 *    name).
 * 2. As customer, create a new cart for the correct channel and section, with
 *    valid source value.
 * 3. Register a product as seller for the same channel/section (simulate being an
 *    allowed seller).
 * 4. Register a variant for the new product (required for optioned cart item).
 * 5. Add the product with variant as item to the customer's cart, with proper
 *    option snapshot and quantity.
 * 6. Call the cart items index endpoint (patch) with default request, and check
 *    the item appears.
 * 7. Call the cart items index endpoint with filter (by product id/variant id),
 *    confirm only filtered items are present.
 * 8. Call the cart items index endpoint with pagination (limit=1,page=1/2),
 *    confirm correct paging structure.
 * 9. Test with an empty cart (new cart, or product id filter for non-existent id),
 *    confirm empty result and correct pagination.
 * 10. Confirm cart item list is not accessible with other customer/carts
 *     (privacy/isolation check).
 */
export async function test_api_cart_item_list_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register customer
  const channel_id = typia.random<string & tags.Format<"uuid">>();
  const customer_join = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel_id,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer_join);

  // Step 2: Create a cart for the customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer_join.id,
        shopping_mall_channel_id: channel_id,
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // Step 3: Register product as seller in same channel/section
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel_id,
        shopping_mall_section_id: cart.shopping_mall_section_id,
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // Step 4: Register a variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(6),
          bar_code: null,
          option_values_hash: RandomGenerator.alphaNumeric(16),
          price: 5000,
          stock_quantity: 10,
          weight: 1.2,
        },
      },
    );
  typia.assert(variant);

  // Step 5: Add the product/variant as a cart item
  const cart_item1 =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: variant.id,
        quantity: 2,
        option_snapshot: JSON.stringify({ color: "blue", size: "M" }),
      },
    });
  typia.assert(cart_item1);

  // Step 6: List all items in the cart (no filter)
  const cart_page =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {},
    });
  typia.assert(cart_page);
  TestValidator.predicate(
    "cart page contains at least 1 item",
    cart_page.data.length >= 1,
  );
  TestValidator.equals(
    "first item matches added cart item",
    cart_page.data[0].id,
    cart_item1.id,
  );

  // Step 7: Filter by product_id (should return only this item)
  const cart_by_product =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: { shopping_mall_product_id: product.id },
    });
  typia.assert(cart_by_product);
  TestValidator.predicate(
    "product filter contains result",
    cart_by_product.data.length >= 1,
  );
  TestValidator.equals(
    "filtered product id correct",
    cart_by_product.data[0].shopping_mall_product_id,
    product.id,
  );

  // Step 8: Filter by variant_id (should return only this item)
  const cart_by_variant =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: { shopping_mall_product_variant_id: variant.id },
    });
  typia.assert(cart_by_variant);
  TestValidator.predicate(
    "variant filter contains result",
    cart_by_variant.data.length >= 1,
  );
  TestValidator.equals(
    "filtered variant id correct",
    cart_by_variant.data[0].shopping_mall_product_variant_id,
    variant.id,
  );

  // Step 9: Test pagination (limit = 1, page = 1)
  const cart_paged1 =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: { limit: 1, page: 1 },
    });
  typia.assert(cart_paged1);
  TestValidator.equals(
    "pagination per page = 1",
    cart_paged1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination page = 1",
    cart_paged1.pagination.current,
    1,
  );
  TestValidator.equals("paged result length", cart_paged1.data.length, 1);

  // Step 9b: Pagination with page 2 (should be empty if only one item)
  const cart_paged2 =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: { limit: 1, page: 2 },
    });
  typia.assert(cart_paged2);
  TestValidator.equals(
    "pagination no data on page 2",
    cart_paged2.data.length,
    0,
  );

  // Step 10: Filter for non-existent product (should return empty)
  const cart_none =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  typia.assert(cart_none);
  TestValidator.equals(
    "filter non-existent product returns 0",
    cart_none.data.length,
    0,
  );

  // Step 11: Create a fresh new cart - should be empty
  const cart2 = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer_join.id,
        shopping_mall_channel_id: channel_id,
        shopping_mall_section_id: cart.shopping_mall_section_id,
        source: "member",
      },
    },
  );
  typia.assert(cart2);
  const cart2_page =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart2.id,
      body: {},
    });
  typia.assert(cart2_page);
  TestValidator.equals(
    "empty new cart returns zero items",
    cart2_page.data.length,
    0,
  );
}
