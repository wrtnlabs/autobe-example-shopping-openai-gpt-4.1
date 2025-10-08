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
 * Successful update of a shopping cart item's quantity by its owner customer.
 *
 * 1. Register a new customer account using random but valid data
 * 2. Create a new cart for this authenticated customer
 * 3. Add a random product SKU (random UUID) as an item to the cart with quantity 1
 * 4. Update the quantity of the cart item to a new valid value (e.g., 2)
 * 5. Validate that the API response contains the updated quantity, and the item
 *    and cart IDs remain unchanged
 */
export async function test_api_cart_item_update_quantity_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Create a cart for the authenticated customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);

  // 3. Add a random SKU as a cart item (simulate valid SKU UUID and quantity 1)
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 1;
  const cartItemCreateBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: initialQuantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      { cartId: cart.id, body: cartItemCreateBody },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "initial cart item quantity is 1",
    cartItem.quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "cart item SKU ID matches",
    cartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "cart item cart ID matches cart",
    cartItem.shopping_mall_cart_id,
    cart.id,
  );

  // 4. Update the cart item quantity to 2 (valid increment, assuming in-stock)
  const updatedQuantity = 2;
  const updateBody = {
    quantity: updatedQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  const updatedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.update(
      connection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCartItem);
  TestValidator.equals(
    "cart item quantity updated to 2",
    updatedCartItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "updated cart item SKU ID matches",
    updatedCartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "updated cart item cart ID matches cart",
    updatedCartItem.shopping_mall_cart_id,
    cart.id,
  );
}
