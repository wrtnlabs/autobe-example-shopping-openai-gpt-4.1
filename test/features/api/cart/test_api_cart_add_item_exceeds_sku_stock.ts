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
 * Verify rejection of add-to-cart requests when SKU quantity exceeds stock.
 *
 * Steps:
 *
 * 1. Register new customer (join)
 * 2. Create cart for customer
 * 3. Attempt to add cart item with excessive quantity for arbitrary SKU
 * 4. Confirm failure and proper error handling
 */
export async function test_api_cart_add_item_exceeds_sku_stock(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer (customer join)
  const customerInput = {
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
  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(auth);

  // Step 2: Create a new cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);

  // Step 3: Attempt to add a SKU with excessive quantity (SKU id simulated as random UUID)
  const fakeSkuId = typia.random<string & tags.Format<"uuid">>();
  const excessiveQuantity = 99999; // exceeds any practical inventory

  await TestValidator.error(
    "add-to-cart with quantity over stock is rejected",
    async () => {
      await api.functional.shoppingMall.customer.carts.cartItems.create(
        connection,
        {
          cartId: cart.id,
          body: {
            shopping_mall_product_sku_id: fakeSkuId,
            quantity: excessiveQuantity,
          },
        },
      );
    },
  );
}
