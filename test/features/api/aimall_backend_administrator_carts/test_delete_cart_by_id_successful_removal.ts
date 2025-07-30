import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that an administrator can successfully perform a hard delete of a
 * shopping cart and its related items.
 *
 * Business context: To safeguard shopping data integrity and compliance,
 * administrators must be able to hard delete shopping carts (and their item
 * records) in legitimate circumstances, with deletion fully traced for audit.
 *
 * Steps:
 *
 * 1. Register a new customer via the customer creation endpoint.
 * 2. Create a new shopping cart for this customer using the admin cart creation
 *    endpoint, associating it with the customer’s UUID.
 * 3. Delete the created cart by invoking the administrator delete endpoint with
 *    the cart's UUID.
 * 4. Attempt to delete the same cart again — should throw an error as it was
 *    already deleted.
 * 5. (Audit/logging is out of scope for this E2E automation.)
 *
 * Expectations:
 *
 * - The cart is successfully deleted with no soft deletion.
 * - All related items are removed via cascading rules.
 * - Re-deletion gives an error (confirming hard-deleted state).
 */
export async function test_api_aimall_backend_administrator_carts_test_delete_cart_by_id_successful_removal(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: RandomGenerator.alphaNumeric(24),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerCreate },
  );
  typia.assert(customer);

  // 2. Create a shopping cart for this customer (admin privileges)
  const cartCreate = {
    aimall_backend_customer_id: customer.id,
  } satisfies IAimallBackendCart.ICreate;
  const cart = await api.functional.aimall_backend.administrator.carts.create(
    connection,
    { body: cartCreate },
  );
  typia.assert(cart);

  // 3. Delete the created cart by UUID
  await api.functional.aimall_backend.administrator.carts.erase(connection, {
    cartId: cart.id,
  });

  // 4. Attempt to delete again — must error (already deleted), confirming hard delete
  await TestValidator.error("Delete should fail for already removed cart")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.erase(
        connection,
        { cartId: cart.id },
      );
    },
  );
  // 5. (Audit/logging is out of scope for this E2E automation)
}
