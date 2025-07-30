import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that order item insertion is denied when attempted by a customer on
 * another customer's order (ownership enforced).
 *
 * This test ensures that a customer cannot manipulate or insert order items
 * into an order that does not belong to them, enforcing one of the most
 * critical business authorization and data-integrity requirements for
 * e-commerce systems.
 *
 * Step-by-step process:
 *
 * 1. Register Customer A (with unique email/phone)
 * 2. Register Customer B (with unique email/phone)
 * 3. Create an order for Customer A as admin (must set customer_id to Customer A)
 * 4. Attempt to add an order item as Customer B (via POST
 *    /aimall-backend/customer/orders/{orderId}/orderItems)
 * 5. Expect and validate that the operation is forbidden/denied (authorization
 *    enforced, error thrown, no data modified)
 */
export async function test_api_aimall_backend_test_add_cart_item_to_another_customers_order_denied(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerAEmail,
        phone: RandomGenerator.mobile(),
        password_hash: "hashedpasswordA",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Register Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerBEmail,
        phone: RandomGenerator.mobile(),
        password_hash: "hashedpasswordB",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerB);

  // 3. Create an order for Customer A via admin
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: customerA.id,
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_status: "pending",
          total_amount: 10000,
          currency: "KRW",
        } satisfies IAimallBackendOrder.ICreate,
      },
    );
  typia.assert(order);

  // 4. Attempt to add an order item as Customer B (should be denied)
  await TestValidator.error("should deny adding order item to another's order")(
    async () => {
      await api.functional.aimall_backend.customer.orders.orderItems.create(
        connection,
        {
          orderId: order.id,
          body: {
            product_id: typia.random<string & tags.Format<"uuid">>(),
            item_name: "Unauthorized Item",
            quantity: 1,
            unit_price: 1000,
            total_price: 1000,
          } satisfies IAimallBackendOrderItem.ICreate,
        },
      );
    },
  );
}
