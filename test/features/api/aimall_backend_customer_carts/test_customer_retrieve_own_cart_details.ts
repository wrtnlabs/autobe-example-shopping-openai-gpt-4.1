import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that a registered customer can retrieve details of their own cart.
 *
 * Business Context: Customers should only be able to fetch carts that they own
 * and not be able to view data about other users' carts or unrelated data
 * fields. The cart entity must include proper ownership, session, and timestamp
 * data.
 *
 * Test Workflow:
 *
 * 1. Register and create a unique customer account (for test isolation).
 * 2. Create a shopping cart for that customer using their customer UUID.
 * 3. Attempt to fetch the cart by its UUID as the owner (same session).
 * 4. Verify that the fetched cart includes the right customer ID, has no
 *    session_token (since this is not a guest cart), and all timestamps are in
 *    valid ISO8601 format.
 * 5. Confirm that fetching this cart returns only data for this customer and not
 *    for any other user or unrelated session.
 */
export async function test_api_aimall_backend_customer_carts_test_customer_retrieve_own_cart_details(
  connection: api.IConnection,
) {
  // 1. Register a unique customer
  const customer_email: string = typia.random<string & tags.Format<"email">>();
  const customer_phone: string = typia.random<string>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer_email,
        phone: customer_phone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a cart for that customer
  const cart: IAimallBackendCart =
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(cart);
  TestValidator.equals("cart owner matches customer")(
    cart.aimall_backend_customer_id,
  )(customer.id);
  TestValidator.equals("session_token for member cart is null")(
    cart.session_token,
  )(null);

  // 3. Retrieve cart details by UUID as the owner
  const fetched: IAimallBackendCart =
    await api.functional.aimall_backend.customer.carts.at(connection, {
      cartId: cart.id,
    });
  typia.assert(fetched);

  // 4. Validate returned fields
  TestValidator.equals("customer id matches")(
    fetched.aimall_backend_customer_id,
  )(customer.id);
  TestValidator.equals("cart id matches")(fetched.id)(cart.id);
  TestValidator.equals("session_token is null for member cart")(
    fetched.session_token,
  )(null);
  TestValidator.predicate("created_at is ISO8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fetched.created_at),
  );
  TestValidator.predicate("updated_at is ISO8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fetched.updated_at),
  );
  // Optionally verify cart_items_count is present and matches (could be 0 or undefined)
  TestValidator.equals("cart_items_count matches")(fetched.cart_items_count)(
    cart.cart_items_count ?? undefined,
  );
}
