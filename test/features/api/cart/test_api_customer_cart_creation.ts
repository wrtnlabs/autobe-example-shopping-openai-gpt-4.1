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
 * Validate shopping cart creation and unique-cart-per-customer enforcement.
 * Tests include:
 *
 * 1. Register a new customer
 * 2. Create a cart with an authorized customer session
 * 3. Validate cart is created and correctly linked to customer
 * 4. Attempt duplicate cart creation and confirm business logic returns existing
 *    cart
 * 5. Attempt creation without authentication (should fail)
 * 6. Attempt creation with invalid token (should fail)
 */
export async function test_api_customer_cart_creation(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinPayload });
  typia.assert(authorized);
  TestValidator.equals(
    "registered customer email matches",
    authorized.email,
    joinPayload.email,
  );

  // 2. Create a cart with the authenticated session
  const created: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(created);
  TestValidator.equals(
    "cart is associated to correct customer",
    created.shopping_mall_customer_id,
    authorized.id,
  );

  // 3. Attempt to create a cart again (should return the same cart)
  const duplicateCreate: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(duplicateCreate);
  TestValidator.equals(
    "no duplicate cart created (same id)",
    duplicateCreate.id,
    created.id,
  );

  // 4. Attempt to create a cart without authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("creation without auth fails", async () => {
    await api.functional.shoppingMall.customer.carts.create(unauthConn, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  });

  // 5. Attempt creation with invalid token (should fail)
  const bogusConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer faketoken" },
  };
  await TestValidator.error("creation with bogus token fails", async () => {
    await api.functional.shoppingMall.customer.carts.create(bogusConn, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  });
}
