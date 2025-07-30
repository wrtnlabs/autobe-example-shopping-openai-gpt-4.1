import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate that an administrator can hard-delete a payment transaction
 * associated with an order.
 *
 * This test ensures that administrators can hard-delete payment transaction
 * records from orders and verifies failure modes, such as double deletion and
 * deletion of non-existent payment IDs. Scenarios requiring business rules like
 * 'reconciled/settled' or 'financial period closed'—which have no corresponding
 * API or DTO representation—are omitted.
 *
 * **Test Steps:**
 *
 * 1. Create a new order as an administrator.
 * 2. Create a valid payment transaction under the order as a seller.
 * 3. Delete the payment transaction as an administrator; expect no content.
 * 4. Attempt to delete the same payment again (should error).
 * 5. Attempt to delete a non-existent paymentId (should return 404).
 *
 * Steps for permission denied (non-admin delete) and deletion of
 * 'reconciled/closed period' payment are omitted, as not implementable with
 * current APIs/DTOs.
 */
export async function test_api_aimall_backend_administrator_orders_payments_test_delete_payment_transaction_by_administrator_success_and_various_failure_modes(
  connection: api.IConnection,
) {
  // 1. Create a new order as administrator
  const orderCreateInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 10000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderCreateInput },
  );
  typia.assert(order);

  // 2. Create a payment transaction under the order as a seller
  const paymentCreateInput: IAimallBackendPayment.ICreate = {
    payment_method: "credit_card",
    amount: 10000,
    currency: "KRW",
    paid_at: new Date().toISOString(),
    transaction_id: `TXN-${Date.now()}`,
  };
  const payment =
    await api.functional.aimall_backend.seller.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateInput,
      },
    );
  typia.assert(payment);

  // 3. Delete the payment transaction as an administrator
  await api.functional.aimall_backend.administrator.orders.payments.erase(
    connection,
    {
      orderId: order.id,
      paymentId: payment.id,
    },
  );

  // 4. Attempt to delete the same payment again (should error)
  await TestValidator.error("deleting already-deleted payment")(() =>
    api.functional.aimall_backend.administrator.orders.payments.erase(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
      },
    ),
  );

  // 5. Attempt to delete a non-existent paymentId (should return not found)
  await TestValidator.error("deleting non-existent paymentId")(() =>
    api.functional.aimall_backend.administrator.orders.payments.erase(
      connection,
      {
        orderId: order.id,
        paymentId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );
}
