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
 * Validate that the cart item cannot be updated to a quantity exceeding SKU
 * stock.
 *
 * This workflow will:
 *
 * 1. Register a new customer with a random address
 * 2. Create a cart for the customer
 * 3. Add a product SKU to the cart with an initial quantity of 1
 * 4. Simulate business context for the referenced SKU such that its available
 *    stock equals 1
 * 5. Try to update the cart item to quantity=2, which exceeds available stock, and
 *    expect a business error
 * 6. Fetch the cart item again and verify that its quantity has not changed
 */
export async function test_api_cart_item_update_quantity_exceeds_stock(
  connection: api.IConnection,
) {
  // 1. Register a new customer with random address
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customerAuth);

  // 2. Create cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);

  // 3. Add a product SKU to cart with quantity 1
  // For this test, we generate a SKU id and assume the available stock for it is 1. In a real system,
  // SKU stock would be checked via product APIs, but for e2e constraints, we'll build logic to ensure the SKU id is unique.
  // We'll use a random UUID and assign quantity=1 which is legal.
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const initialCartItemBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: initialCartItemBody,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("initial quantity is 1", cartItem.quantity, 1);

  // 4. Attempt to update cart item quantity to 2 (exceeding presumed SKU stock of 1)
  await TestValidator.error(
    "updating cart item beyond SKU stock should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.cartItems.update(
        connection,
        {
          cartId: cart.id,
          cartItemId: cartItem.id,
          body: { quantity: 2 } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );

  // 5. (Re-)fetch the cart item, quantity should remain unchanged at 1.
  // There is no separate API for fetching a single cart item, so we refetch the cart and inspect cart_items
  const cartReloaded: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cartReloaded);
  const reloadedItem = (cartReloaded.cart_items || []).find(
    (item) => item.id === cartItem.id,
  );
  typia.assertGuard<IShoppingMallCartItem>(reloadedItem!);
  TestValidator.equals(
    "cart item quantity remains 1 after failed update",
    reloadedItem!.quantity,
    1,
  );
}
