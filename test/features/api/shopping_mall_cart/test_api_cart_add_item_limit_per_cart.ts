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
 * Test cart unique item (SKU) limit enforcement. Ensures a customer may not add
 * more than 50 unique SKUs to their cart, and an error is returned when trying
 * to add the 51st.
 */
export async function test_api_cart_add_item_limit_per_cart(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create a new cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Add SKUs up to the maximum allowed (e.g., 50 unique SKUs)
  const maxSkus = 50;
  const skuIds = ArrayUtil.repeat(maxSkus, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const skuId of skuIds) {
    const item =
      await api.functional.shoppingMall.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: {
            shopping_mall_product_sku_id: skuId,
            quantity: 1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(item);
  }
  // 4. Attempt to add one more unique SKU beyond the allowed limit.
  const overflowSkuId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error if adding more than max unique SKUs to cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: {
            shopping_mall_product_sku_id: overflowSkuId,
            quantity: 1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );
}
