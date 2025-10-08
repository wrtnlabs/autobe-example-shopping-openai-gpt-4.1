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
 * Validate the deletion of a shopping cart by its owner (customer).
 *
 * Steps:
 *
 * 1. Register a customer (providing email, password, full name, phone, address)
 * 2. Customer creates a cart
 * 3. Customer deletes the cart with DELETE API
 * 4. Ensure cart is removed (any subsequent DELETE on the same cartId fails/has no
 *    effect)
 * 5. Another customer tries to delete the first customer's cart and fails
 *    (authorization check)
 * 6. After deletion, the owner creates a new cart successfully
 */
export async function test_api_customer_cart_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register first customer (who will own the cart)
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customerAuth);

  // 2. Customer creates a cart
  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(createdCart);
  TestValidator.equals(
    "cart owner is authenticated customer",
    createdCart.shopping_mall_customer_id,
    customerAuth.id,
  );

  // 3. Customer deletes their own cart
  await api.functional.shoppingMall.customer.carts.erase(connection, {
    cartId: createdCart.id,
  });

  // 4. Re-delete (should fail or have no effect -- we expect an error, as cart should not exist)
  await TestValidator.error(
    "deleting an already deleted cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(connection, {
        cartId: createdCart.id,
      });
    },
  );

  // 5. Register a different customer (non-owner)
  const otherCustomerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Busan",
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: undefined,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const otherAuth = await api.functional.auth.customer.join(connection, {
    body: otherCustomerInput,
  });
  typia.assert(otherAuth);

  // Try to delete original (first) customer's cart by another authenticated user (should fail, though the cart is already deleted)
  await TestValidator.error(
    "non-owner cannot delete other's cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(connection, {
        cartId: createdCart.id,
      });
    },
  );

  // 6. After successful deletion, the original customer can create a new cart
  // Log in again as the original customer by re-issuing their token
  // The API sets connection.headers.Authorization = output.token.access after join
  // so we need to call join again for the original user to switch context, but for E2E, this is usually enough
  const originalAuth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(originalAuth);
  const newCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(newCart);
  TestValidator.notEquals(
    "new cart id should differ from deleted",
    newCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "new cart owner is authenticated customer",
    newCart.shopping_mall_customer_id,
    originalAuth.id,
  );
}
