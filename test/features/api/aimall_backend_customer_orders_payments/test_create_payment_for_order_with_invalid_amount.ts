import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Test that API properly rejects invalid payment requests for an order,
 * enforcing business rules.
 *
 * This test performs the following sequence:
 *
 * 1. Create a customer and seller.
 * 2. Place an order for the customer with the seller.
 * 3. Attempts to create payments for the order that violate business rules:
 *
 *    - Exceeding the order's total amount.
 *    - Paying less than the required amount.
 *    - Using a different currency than the order. Each attempt must be rejected with
 *         a business validation error.
 *
 * This verifies data integrity and payment validation logic by checking the API
 * does not allow mismatched payment events.
 */
export async function test_api_aimall_backend_customer_orders_payments_test_create_payment_for_order_with_invalid_amount(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Test Business " + RandomGenerator.alphaNumeric(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Place an order (fixed amount/currency for payment business rules)
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 50000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 4. Payment attempts violating business logic
  // 4-1. Overpay
  await TestValidator.error("payment amount exceeds order total")(() =>
    api.functional.aimall_backend.customer.orders.payments.create(connection, {
      orderId: order.id,
      body: {
        payment_method: "credit_card",
        amount: 99999,
        currency: order.currency,
        transaction_id: "OVERPAY-TEST",
        paid_at: new Date().toISOString(),
      },
    }),
  );
  // 4-2. Underpay
  await TestValidator.error("payment amount less than order total")(() =>
    api.functional.aimall_backend.customer.orders.payments.create(connection, {
      orderId: order.id,
      body: {
        payment_method: "deposit",
        amount: 1,
        currency: order.currency,
        transaction_id: "UNDERPAY-TEST",
        paid_at: new Date().toISOString(),
      },
    }),
  );
  // 4-3. Currency mismatch
  await TestValidator.error("currency mismatch")(() =>
    api.functional.aimall_backend.customer.orders.payments.create(connection, {
      orderId: order.id,
      body: {
        payment_method: "deposit",
        amount: order.total_amount,
        currency: "USD",
        transaction_id: "CUR-ERR-TEST",
        paid_at: new Date().toISOString(),
      },
    }),
  );
}
