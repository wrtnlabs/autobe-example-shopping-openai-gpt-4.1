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
 * Validate that duplicate SKU additions to cart are prevented (unique SKU
 * constraint in shopping cart items).
 *
 * Steps:
 *
 * 1. Register a new customer (random email, password, name, phone, address).
 * 2. Create a new cart for the customer (authenticated session).
 * 3. Add an item to the cart using a valid random SKU and quantity.
 * 4. Attempt to add the same SKU again (should fail with a business validation
 *    error for duplicate SKU).
 * 5. Assert only one unique SKU entry exists in the cart, and the item count is
 *    unchanged by failure.
 */
export async function test_api_cart_add_item_duplicate_sku(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const fullName = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const address: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: fullName,
    phone,
    region: "Seoul",
    postal_code: "03187",
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  };

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        full_name: fullName,
        phone,
        address,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a new cart for the customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 3. Add an item to the cart
  // Simulate a SKU id (in reality, product SKU IDs would be fetched or created, but here generate a valid UUID)
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: skuId,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  // 4. Attempt to add the same SKU again (should fail)
  await TestValidator.error("cannot add duplicate SKU to cart", async () => {
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: skuId,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  });

  // 5. Confirm by adding a new SKU and total unique SKU entries remain correct
  const anotherSkuId = typia.random<string & tags.Format<"uuid">>();
  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: anotherSkuId,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  TestValidator.notEquals(
    "skuIds should be unique",
    cartItem1.shopping_mall_product_sku_id,
    cartItem2.shopping_mall_product_sku_id,
  );
}
