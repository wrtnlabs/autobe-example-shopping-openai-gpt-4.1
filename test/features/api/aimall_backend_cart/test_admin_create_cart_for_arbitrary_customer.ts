import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * E2E test for administrator creating a cart for an arbitrary customer or
 * guest.
 *
 * Validates that an administrator can create a cart for a valid customer (by
 * customer UUID) and for a guest session (by session_token), that output is
 * properly attributed, required fields are populated, and creation/business
 * rules are enforced.
 *
 * Steps:
 *
 * 1. Generate a random customer UUID and create a cart for that customer via admin
 *    endpoint.
 * 2. Assert output fields (customer_id, created_at, updated_at) are correct.
 * 3. Attempt creating a cart without required identity information (should fail
 *    with error).
 * 4. Create a cart for a guest/anonymous session and assert proper output.
 */
export async function test_api_aimall_backend_cart_test_admin_create_cart_for_arbitrary_customer(
  connection: api.IConnection,
) {
  // 1. Generate random customer UUID for test
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create cart for arbitrary customer as administrator
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerId,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // Assert attribution and required field population
  TestValidator.equals("cart attribution - customerId matches")(
    cart.aimall_backend_customer_id,
  )(customerId);
  TestValidator.predicate("created_at must exist")(!!cart.created_at);
  TestValidator.predicate("updated_at must exist")(!!cart.updated_at);

  // 3. Negative case: missing both customer_id and session_token should fail
  await TestValidator.error("must specify either customer_id or session_token")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.create(
        connection,
        {
          body: {} satisfies IAimallBackendCart.ICreate,
        },
      );
    },
  );

  // 4. Create a cart for a guest (session_token)
  const sessionToken: string = typia.random<string>();
  const guestCart =
    await api.functional.aimall_backend.administrator.carts.create(connection, {
      body: {
        session_token: sessionToken,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(guestCart);
  TestValidator.equals("guest cart session_token matches")(
    guestCart.session_token,
  )(sessionToken);
  TestValidator.predicate("guest cart created_at must exist")(
    !!guestCart.created_at,
  );
  TestValidator.predicate("guest cart updated_at must exist")(
    !!guestCart.updated_at,
  );
}
