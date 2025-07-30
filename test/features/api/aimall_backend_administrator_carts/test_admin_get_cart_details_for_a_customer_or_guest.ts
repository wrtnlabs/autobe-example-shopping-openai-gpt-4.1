import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate administrator access to view any cart details (customer carts and
 * guest carts).
 *
 * Ensures an administrator can:
 *
 * 1. Retrieve a customer-owned cart by cartId and see all cart fields match
 *    schema.
 * 2. Retrieve a guest cart (session_token-only) by cartId and see fields match
 *    schema.
 * 3. Receive a not-found error for a nonexistent cartId.
 * 4. Receive an unauthorized error if admin authentication is missing.
 *
 * Test Steps:
 *
 * 1. Create a customer cart (with aimall_backend_customer_id).
 * 2. Create a guest cart (with session_token only).
 * 3. As admin, fetch each cart by cartId and check all fields.
 * 4. Check retrieval fails for a random/nonexistent cartId.
 * 5. Remove admin auth by cloning connection&headers, confirm unauthorized error
 *    occurs.
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_get_cart_details_for_a_customer_or_guest(
  connection: api.IConnection,
) {
  // 1. Create a customer-owned cart
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const customerCart =
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customer_id,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(customerCart);

  // 2. Create a guest cart (anonymous cart with session_token)
  const session_token = RandomGenerator.alphaNumeric(32);
  const guestCart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        session_token,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(guestCart);

  // 3a. Admin fetches customer-owned cart by cartId
  const admin_cart_customer =
    await api.functional.aimall_backend.administrator.carts.at(connection, {
      cartId: customerCart.id,
    });
  typia.assert(admin_cart_customer);
  TestValidator.equals("admin sees same cart id")(admin_cart_customer.id)(
    customerCart.id,
  );
  TestValidator.equals("admin sees correct customer id")(
    admin_cart_customer.aimall_backend_customer_id,
  )(customer_id);
  TestValidator.predicate("admin sees customer cart has no session token")(
    !admin_cart_customer.session_token,
  );
  TestValidator.predicate("admin sees valid created_at (customer cart)")(
    !!admin_cart_customer.created_at,
  );
  TestValidator.predicate("admin sees valid updated_at (customer cart)")(
    !!admin_cart_customer.updated_at,
  );
  TestValidator.predicate(
    "admin sees cart_items_count is number or undefined (customer cart)",
  )(
    typeof admin_cart_customer.cart_items_count === "number" ||
      typeof admin_cart_customer.cart_items_count === "undefined",
  );

  // 3b. Admin fetches guest cart by cartId
  const admin_cart_guest =
    await api.functional.aimall_backend.administrator.carts.at(connection, {
      cartId: guestCart.id,
    });
  typia.assert(admin_cart_guest);
  TestValidator.equals("admin sees same cart id")(admin_cart_guest.id)(
    guestCart.id,
  );
  TestValidator.predicate("admin sees guest cart has no customer id")(
    !admin_cart_guest.aimall_backend_customer_id,
  );
  TestValidator.equals("admin sees correct session token")(
    admin_cart_guest.session_token,
  )(session_token);
  TestValidator.predicate("admin sees valid created_at (guest cart)")(
    !!admin_cart_guest.created_at,
  );
  TestValidator.predicate("admin sees valid updated_at (guest cart)")(
    !!admin_cart_guest.updated_at,
  );
  TestValidator.predicate(
    "admin sees cart_items_count is number or undefined (guest cart)",
  )(
    typeof admin_cart_guest.cart_items_count === "number" ||
      typeof admin_cart_guest.cart_items_count === "undefined",
  );

  // 4. Admin fetches with a non-existent cartId (should error)
  await TestValidator.error("admin fetches with nonexistent cartId")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.at(connection, {
        cartId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Remove admin authentication by cloning connection (headers without Authorization)
  const connectionWithoutAuth: api.IConnection = {
    ...connection,
    headers: connection.headers ? { ...connection.headers } : {},
  };
  if (
    connectionWithoutAuth.headers &&
    "Authorization" in connectionWithoutAuth.headers
  ) {
    delete connectionWithoutAuth.headers.Authorization;
  }
  await TestValidator.error("admin unauthorized access should error")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.at(
        connectionWithoutAuth,
        {
          cartId: customerCart.id,
        },
      );
    },
  );
}
