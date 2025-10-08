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
 * Verify removal of cart item via quantity update.
 *
 * 1. Register a new shopping mall customer.
 * 2. Create a new cart for this customer.
 * 3. Add a randomly-generated SKU to the cart with quantity 1.
 * 4. Update the cart item by setting quantity to 0 -- this should remove it from
 *    the cart.
 * 5. Fetch the cart and assert that its cart_items array is empty/undefined or the
 *    item is no longer present.
 * 6. Make robust assertions at each step using typia.assert and TestValidator, per
 *    scenario rules.
 */
export async function test_api_cart_item_update_quantity_remove_item(
  connection: api.IConnection,
) {
  // 1. Register a new shopping mall customer
  const registration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.pick(["Seoul", "Incheon", "Busan"] as const),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: `${RandomGenerator.alphaNumeric(4)} St`,
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: registration });
  typia.assert(customer); // Type safety already validated

  // 2. Create a cart for the customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);
  TestValidator.equals(
    "customer id in cart matches authenticated user",
    cart.shopping_mall_customer_id,
    customer.id,
  );

  // 3. Add a SKU item to the cart (random id and quantity 1)
  const skuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const addPayload = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: addPayload,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart id matches in cart item",
    cartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "sku id matches add payload",
    cartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals("initial quantity is 1", cartItem.quantity, 1);

  // 4. Update the cart item's quantity to 0 -- triggers removal
  const updatePayload = {
    quantity: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallCartItem.IUpdate;
  await api.functional.shoppingMall.customer.carts.cartItems.update(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
      body: updatePayload,
    },
  );
  // By design: when quantity reaches 0, the item is removed so there's no valid cart item to return.

  // Optional: fetch cart again to confirm removal -- can't reuse cart API directly as no 'cart get' is provided; instead, check by attempting status assertions or infer by absence on listing.
  // Re-fetching via cart creation will return current state if one exists (business rule: at most one cart per customer)
  const updatedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(updatedCart);
  TestValidator.equals(
    "cart id unchanged after update (business: only one cart per customer)",
    updatedCart.id,
    cart.id,
  );
  TestValidator.predicate(
    "cart_items array is empty or undefined after removal",
    !updatedCart.cart_items || updatedCart.cart_items.length === 0,
  );
}
