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
 * E2E: Add new product SKU as a cart item for a customer (normal path)
 *
 * This test covers the following workflow:
 *
 * 1. Register a new customer with default address information.
 * 2. Create a shopping cart for the customer.
 * 3. Add a valid product SKU (with a plausible UUID) to the cart with a permitted
 *    quantity (e.g. 1).
 * 4. Assert that the cart item is created with the correct SKU, the quantity
 *    matches request, and the unit price snapshot is present.
 *
 * Only DTOs and endpoints provided in the materials are used; product/SKU
 * creation and lookup is out of scope, so a random SKU UUID is used for
 * demonstration.
 */
export async function test_api_cart_add_item_normal_operation(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: "123 Main St",
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);

  // 2. Create a cart for the customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);

  // 3. Add an item (SKU) to the cart
  const skuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestedQuantity = 1 as number & tags.Type<"int32">;

  const itemBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: requestedQuantity,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.cartItems.create(
      connection,
      { cartId: cart.id, body: itemBody },
    );
  typia.assert(cartItem);

  // 4. Validate cart item business logic
  TestValidator.equals(
    "cart id matches",
    cartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "sku id matches",
    cartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "quantity matches",
    cartItem.quantity,
    requestedQuantity,
  );
  TestValidator.predicate(
    "unit price snapshot is positive",
    cartItem.unit_price_snapshot > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof cartItem.created_at === "string" && /T/.test(cartItem.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof cartItem.updated_at === "string" && /T/.test(cartItem.updated_at),
  );
}
