import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate enforcement of unique cart constraint for customers.
 *
 * This test ensures that the system prevents a customer from having multiple
 * active carts simultaneously. According to business logic, only one cart is
 * permitted per customer at any given time. The procedure intentionally
 * attempts to violate this rule to verify proper conflict/error handling.
 *
 * Step-by-step process:
 *
 * 1. Provision an initial cart for a customer by calling cart creation API with
 *    their customer_id
 * 2. Attempt to create a second cart using the same customer_id (simulating
 *    violation of the uniqueness rule)
 * 3. Expect the API to reject the second creation with a conflict or validation
 *    error, demonstrating correct enforcement
 *
 * This test confirms the business rule is enforced both in business logic and
 * at the API contract level.
 */
export async function test_api_aimall_backend_customer_carts_test_create_cart_duplicate_for_same_customer_should_fail(
  connection: api.IConnection,
) {
  // 1. Prepare a customer UUID
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create the initial cart for this customer
  const firstCart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customerId,
      } satisfies IAimallBackendCart.ICreate,
    },
  );
  typia.assert(firstCart);
  TestValidator.equals("Correct customer association")(
    firstCart.aimall_backend_customer_id,
  )(customerId);

  // 3. Try to create a second cart for the same customer, expecting error
  await TestValidator.error("Second cart for same customer is forbidden")(() =>
    api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customerId,
      } satisfies IAimallBackendCart.ICreate,
    }),
  );
}
