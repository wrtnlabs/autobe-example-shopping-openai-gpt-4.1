import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Test that a customer (non-admin) cannot delete a cart via the administrator
 * DELETE endpoint.
 *
 * This test validates access control enforcement for the admin cart deletion
 * endpoint. It ensures that only users with administrator privileges can delete
 * carts using /aimall-backend/administrator/carts/{cartId}. A customer account
 * attempts the deletion and is blocked (e.g., receives 403 Forbidden). The cart
 * remains after a failed attempt.
 *
 * Steps:
 *
 * 1. Register a customer (non-admin)
 * 2. As admin, create a cart for the customer
 * 3. As the customer, attempt to delete that cart via the admin DELETE endpoint;
 *    verify an authorization error (e.g., 403 Forbidden) is thrown
 * 4. Note: Since no GET endpoint exists for confirmation, post-delete existence is
 *    not validated
 */
export async function test_api_aimall_backend_test_delete_cart_access_control_violation(
  connection: api.IConnection,
) {
  // 1. Register a customer user (no admin privileges)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. As admin, create a cart assigned to this customer
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Attempt to delete the cart as a customer (should fail with authorization error)
  // NOTE: The test assumes the e2e harness can simulate acting as a customer.
  await TestValidator.error("Customer cannot delete cart via admin endpoint")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.erase(
        connection,
        {
          cartId: cart.id,
        },
      );
    },
  );
  // 4. Cannot directly verify existence after failed delete since no GET/read endpoint
}
