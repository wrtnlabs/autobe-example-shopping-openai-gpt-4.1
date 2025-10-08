import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate retrieval of a specific cart item by its owner (authenticated
 * customer).
 *
 * 1. Register a new customer with all required details (address etc), which also
 *    authenticates them.
 * 2. Create a new shopping cart for this customer.
 * 3. Add a SKU (SKU ID must be random/unique—simulate as needed) to the cart with
 *    a valid quantity.
 * 4. Retrieve the cart item details via GET
 *    /shoppingMall/customer/carts/{cartId}/cartItems/{cartItemId} as the
 *    authenticated customer.
 * 5. Validate that:
 *
 *    - The retrieved item matches the item that was added (ID, SKU, quantity, unit
 *         price, timestamps).
 *    - The shopping_mall_cart_id, shopping_mall_product_sku_id, and all properties
 *         comply with the models.
 *    - Only the owner can retrieve it (ownership enforced).
 *    - Item detail reflects price/quantity at the time it was added.
 * 6. Try to retrieve the same cart item with an invalid cartItemId (expect error).
 * 7. Try to retrieve a cart item without authentication (expect error).
 */
export async function test_api_customer_cartitem_detail_view_by_owner(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: {} },
  );
  typia.assert(cart);

  // 3. Add cart item (simulate random SKU)
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const quantity = 2;
  const addBody = {
    shopping_mall_product_sku_id: skuId,
    quantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      { cartId: cart.id, body: addBody },
    );
  typia.assert(cartItem);

  // 4. Retrieve cart item detail
  const read = await api.functional.shoppingMall.customer.carts.cartItems.at(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
    },
  );
  typia.assert(read);
  TestValidator.equals("cart item id matches", read.id, cartItem.id);
  TestValidator.equals("cart id matches", read.shopping_mall_cart_id, cart.id);
  TestValidator.equals(
    "SKU id matches",
    read.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals("quantity matches", read.quantity, quantity);
  TestValidator.equals(
    "unit price snapshot matches",
    read.unit_price_snapshot,
    cartItem.unit_price_snapshot,
  );

  // 5. Try to fetch with invalid cartItemId
  await TestValidator.error(
    "fetching unknown cartItemId should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.cartItems.at(
        connection,
        {
          cartId: cart.id,
          cartItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Try to fetch without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated should fail to fetch cart item",
    async () => {
      await api.functional.shoppingMall.customer.carts.cartItems.at(
        unauthConn,
        {
          cartId: cart.id,
          cartItemId: cartItem.id,
        },
      );
    },
  );
}
