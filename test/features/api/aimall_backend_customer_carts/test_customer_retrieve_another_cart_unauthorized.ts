import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Test unauthorized retrieval of another customer's cart and access control
 * enforcement.
 *
 * This test verifies that a customer cannot access a cart belonging to someone
 * else, and that access control for cart retrieval is strictly enforced by the
 * backend.
 *
 * Business context:
 *
 * - Shopping carts are strictly private to the customer who created them
 *   (ownership enforced).
 * - Any attempt to retrieve another customer's cart, or a cart that does not
 *   exist, must fail with an error (e.g., forbidden, unauthorized, or not
 *   found).
 *
 * Test Workflow:
 *
 * 1. Create two different customers (customerA and customerB).
 * 2. Each customer creates their own shopping cart via the backend.
 * 3. As customerA, attempt to retrieve the cart created by customerB—must fail
 *    with access error.
 * 4. Additionally, attempt retrieval using a random UUID as cartId (should error
 *    as well).
 *
 * This ensures that access control policy for carts is robust.
 */
export async function test_api_aimall_backend_customer_carts_test_customer_retrieve_another_cart_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create two distinct customers
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPhone: string = RandomGenerator.mobile();
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerAEmail,
        phone: customerAPhone,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerA);

  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPhone: string = RandomGenerator.mobile();
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerBEmail,
        phone: customerBPhone,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // 2. Each customer creates their own cart
  const cartA = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerA.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cartA);

  const cartB = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerB.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cartB);

  // 3. As customerA, attempt unauthorized retrieval of customerB's cart
  TestValidator.error("customerA cannot access customerB's cart")(async () => {
    await api.functional.aimall_backend.customer.carts.at(connection, {
      cartId: cartB.id,
    });
  });

  // 4. Try to access a random/non-existent cartId
  TestValidator.error("random cartId should not be retrievable")(async () => {
    await api.functional.aimall_backend.customer.carts.at(connection, {
      cartId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
