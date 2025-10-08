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
 * Validate the complete customer cart retrieval workflow, covering normal and
 * edge cases.
 *
 * Steps:
 *
 * 1. Register a new customer (join) with realistic random info (email, password,
 *    full_name, phone, address).
 * 2. Authenticate as the customer to obtain JWT tokens via join (handled by SDK
 *    automatically).
 * 3. Create a shopping cart for the authenticated customer using carts.create
 *    (empty body).
 * 4. Retrieve the cart details using carts.at with the returned cartId, validate
 *    that meta and ownership match.
 * 5. Assert that the cart_items property exists (may be empty, but must match
 *    schema).
 * 6. Edge case: attempt access with a random invalid cartId (should fail with
 *    error).
 * 7. Edge case: attempt cart retrieval while not authenticated (simulate with
 *    unauthenticated connection, should fail).
 * 8. Validate ownership: other customers cannot access this cart.
 * 9. For all cart retrievals, assert typia structure and all core fields (id,
 *    shopping_mall_customer_id, created_at, updated_at, cart_items[]).
 */
export async function test_api_customer_cart_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword!123",
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.name(1),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);

  // 2. Create a new cart for the customer (must be authenticated already)
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: {} },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart owner id is customer id",
    cart.shopping_mall_customer_id,
    authorized.id,
  );
  TestValidator.predicate(
    "cart id is uuid format",
    typeof cart.id === "string" && cart.id.length === 36,
  );

  // 3. Retrieve cart details by ID
  const retrieved = await api.functional.shoppingMall.customer.carts.at(
    connection,
    { cartId: cart.id },
  );
  typia.assert(retrieved);
  TestValidator.equals("retrieved cart id matches", retrieved.id, cart.id);
  TestValidator.equals(
    "retrieved cart owner id matches",
    retrieved.shopping_mall_customer_id,
    authorized.id,
  );
  TestValidator.equals(
    "cart_items is array or undefined",
    Array.isArray(retrieved.cart_items) || retrieved.cart_items === undefined,
    true,
  );
  if (Array.isArray(retrieved.cart_items)) {
    for (const item of retrieved.cart_items) {
      typia.assert(item);
    }
  }

  // 4. Edge case: invalid cartId
  await TestValidator.error("retrieval with invalid cartId fails", async () => {
    await api.functional.shoppingMall.customer.carts.at(connection, {
      cartId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. Edge case: unauthenticated retrieval
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "retrieval without authentication fails",
    async () => {
      await api.functional.shoppingMall.customer.carts.at(unauthConn, {
        cartId: cart.id,
      });
    },
  );

  // 6. Validate that other customers cannot access this cart
  const joinInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "anotherPass!456",
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.name(1),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized2 = await api.functional.auth.customer.join(connection, {
    body: joinInput2,
  });
  typia.assert(authorized2);
  await TestValidator.error(
    "other customer cannot access this cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.at(connection, {
        cartId: cart.id,
      });
    },
  );
}
