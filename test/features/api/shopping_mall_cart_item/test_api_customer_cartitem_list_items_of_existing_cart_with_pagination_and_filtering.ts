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
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Test listing paginated and filterable cart items from an existing customer's
 * cart.
 *
 * 1. Register and authenticate a new customer with a valid address.
 * 2. Create a shopping cart for that customer.
 * 3. Add two items (with unique SKU ids) to the cart, storing SKU IDs and
 *    quantities.
 * 4. List cart items with default parameters (no filter/pagination): assert both
 *    items exist.
 * 5. List cart items with limit=1 and page=1: assert paginated results correspond.
 * 6. List cart items with productId/skuId filter: assert correct filtering (may
 *    use one of SKUs from step 3).
 * 7. Attempt to list items for an unauthorized cart (random UUID): expect error.
 * 8. Assert response structure, pagination correctness, item details (id, sku,
 *    quantity, price snapshot, timestamps).
 */
export async function test_api_customer_cartitem_list_items_of_existing_cart_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(auth);

  // 2. Create a shopping cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);

  // 3. Add two distinct items to the cart
  const skuId1 = typia.random<string & tags.Format<"uuid">>();
  const skuId2 = typia.random<string & tags.Format<"uuid">>();
  const addItem1 =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: skuId1,
          quantity: 1,
        },
      },
    );
  typia.assert(addItem1);
  const addItem2 =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: skuId2,
          quantity: 2,
        },
      },
    );
  typia.assert(addItem2);

  // 4. List cart items with default params (all items)
  const defaultList =
    await api.functional.shoppingMall.customer.carts.cartItems.index(
      connection,
      {
        cartId: cart.id,
        body: {},
      },
    );
  typia.assert(defaultList);
  TestValidator.predicate(
    "default list returns all inserted items",
    defaultList.data.some((x) => x.id === addItem1.id) &&
      defaultList.data.some((x) => x.id === addItem2.id),
  );

  // 5. List cart items with limit=1, page=1 (pagination)
  const paged =
    await api.functional.shoppingMall.customer.carts.cartItems.index(
      connection,
      {
        cartId: cart.id,
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination returns one item for limit=1",
    paged.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata correct",
    paged.pagination.limit === 1 &&
      paged.pagination.current === 1 &&
      paged.pagination.records >= 2,
  );

  // 6. List cart items with productId/skuId filter
  const skuFilter =
    await api.functional.shoppingMall.customer.carts.cartItems.index(
      connection,
      {
        cartId: cart.id,
        body: {
          skuId: addItem2.shopping_mall_product_sku_id,
        },
      },
    );
  typia.assert(skuFilter);
  TestValidator.equals(
    "sku filter returns only filtered item",
    skuFilter.data.length,
    1,
  );
  TestValidator.equals(
    "filtered item is correct",
    skuFilter.data[0].id,
    addItem2.id,
  );

  // 7. Unauthorized access: random cartId
  await TestValidator.error(
    "unauthorized listing with random cartId fails",
    async () => {
      await api.functional.shoppingMall.customer.carts.cartItems.index(
        connection,
        {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 8. Field/assertion checks
  for (const summary of defaultList.data) {
    TestValidator.equals(
      "summary shopping_mall_cart_id matches cart.id",
      summary.shopping_mall_cart_id,
      cart.id,
    );
    TestValidator.predicate("summary quantity positive", summary.quantity > 0);
    TestValidator.predicate(
      "summary price snapshot positive",
      summary.unit_price_snapshot > 0,
    );
    TestValidator.predicate(
      "summary created_at and updated_at present",
      typeof summary.created_at === "string" &&
        typeof summary.updated_at === "string",
    );
  }
}
