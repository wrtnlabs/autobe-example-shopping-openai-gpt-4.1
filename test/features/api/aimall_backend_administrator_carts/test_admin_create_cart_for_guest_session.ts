import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate administrator's ability to create a cart for a guest session.
 *
 * This test ensures that an administrator can create a shopping cart for an
 * anonymous (non-customer) user by providing only a unique session_token. The
 * system should allow cart creation for such a non-customer session, filling
 * all required fields, and demonstrate that admin privileges extend to managing
 * guest carts for troubleshooting or UX recovery scenarios.
 *
 * Steps:
 *
 * 1. Generate a unique session_token to simulate a guest (anonymous) session.
 * 2. As admin, call the cart creation API with only session_token supplied in the
 *    body (no customer_id).
 * 3. Validate that the API succeeds and the returned cart object reflects a
 *    correct guest cart: session_token is set and matches input, customer_id is
 *    undefined, and all metadata fields are properly assigned.
 * 4. Assert that a new UUID is generated, timestamps are in correct date-time
 *    format, and cart_items_count is initialized to 0 or undefined (per API
 *    behavior).
 * 5. Try creating a second cart with the same session_token and assert failure due
 *    to uniqueness constraint.
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_create_cart_for_guest_session(
  connection: api.IConnection,
) {
  // 1. Generate a unique session_token for simulated anonymous session
  const sessionToken = RandomGenerator.alphaNumeric(32);

  // 2. Create a cart as admin for this session_token, omitting customer_id.
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        session_token: sessionToken,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Validate all properties of the guest cart
  // Session token must exactly match what was supplied
  TestValidator.equals("session_token should match")(cart.session_token)(
    sessionToken,
  );
  // Customer ID must not be set
  TestValidator.equals("customer ID should not be set")(
    cart.aimall_backend_customer_id,
  )(undefined);
  // Cart ID must be a valid UUID
  TestValidator.predicate("cart id is uuid")(
    typeof cart.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        cart.id,
      ),
  );
  // created_at must be ISO 8601
  TestValidator.predicate("created_at is ISO8601")(
    !!cart.created_at &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(cart.created_at),
  );
  // updated_at must be ISO 8601
  TestValidator.predicate("updated_at is ISO8601")(
    !!cart.updated_at &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(cart.updated_at),
  );
  // cart_items_count should be 0 or undefined for new cart
  if (cart.cart_items_count !== undefined)
    TestValidator.equals("empty cart")(cart.cart_items_count)(0);

  // 4. Try to create another cart for the same session_token -- should be rejected by uniqueness constraint
  await TestValidator.error("duplicate session_token should be rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.create(
        connection,
        {
          body: {
            session_token: sessionToken,
          } satisfies IAimallBackendCart.ICreate,
        },
      );
    },
  );
}
