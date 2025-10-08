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
 * Test the scenario where a new customer joins, creates a shopping cart, and
 * successfully updates the cart's timestamp.
 *
 * Steps:
 *
 * 1. Register a new customer (join).
 * 2. Create a shopping cart for this customer (authenticated).
 * 3. Update the cart's updated_at timestamp (only updatable field).
 * 4. Validate the updated timestamp and cart identity/ownership.
 */
export async function test_api_customer_cart_update_successful_modification(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Create a shopping cart for the registered customer
  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(createdCart);
  TestValidator.equals(
    "owner id matches customer id",
    createdCart.shopping_mall_customer_id,
    authorized.id,
  );

  // 3. Update the cart's updated_at timestamp
  const updateBody = {
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallCart.IUpdate;

  const updatedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: createdCart.id,
      body: updateBody,
    });
  typia.assert(updatedCart);

  // 4. Validate update
  TestValidator.equals("cart id unchanged", updatedCart.id, createdCart.id);
  TestValidator.equals(
    "owner id matches after update",
    updatedCart.shopping_mall_customer_id,
    authorized.id,
  );
  TestValidator.equals(
    "updated_at is newly set",
    updatedCart.updated_at,
    updateBody.updated_at,
  );
}
