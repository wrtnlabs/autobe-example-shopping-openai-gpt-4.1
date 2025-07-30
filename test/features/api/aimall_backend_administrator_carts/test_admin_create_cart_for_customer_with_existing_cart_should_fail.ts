import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validates that the system enforces the one-cart-per-customer rule when an
 * administrator tries to create a cart for a customer who already has an active
 * cart.
 *
 * Business context: Only one active shopping cart is allowed per customer. The
 * administrator endpoint lets admins create carts on behalf of customers for
 * support or recovery flows, but must enforce uniqueness constraints. This test
 * ensures validation/conflict error occurs if an admin attempts a duplicate
 * cart creation for the same customer.
 *
 * Steps:
 *
 * 1. Generate a random customer UUID (simulate an existing customer).
 * 2. As administrator, create a cart for the customer (first POST).
 * 3. Attempt to create another cart for the same customer (second POST).
 * 4. Expect the second attempt to result in a validation/conflict error,
 *    confirming the one-cart-per-customer rule is enforced.
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_create_cart_for_customer_with_existing_cart_should_fail(
  connection: api.IConnection,
) {
  // 1. Generate a random customer UUID
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 2. As administrator, create a cart for the customer
  const cart1 = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerId,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart1);
  TestValidator.equals("cart.customer id matches")(
    cart1.aimall_backend_customer_id,
  )(customerId);

  // 3. Attempt to create another cart for the same customer - should fail with conflict error
  await TestValidator.error("Second cart creation for same customer must fail")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.create(
        connection,
        {
          body: {
            aimall_backend_customer_id: customerId,
          } satisfies IAimallBackendCart.ICreate,
        },
      );
    },
  );
}
