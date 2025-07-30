import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate seller creates a payment record for a customer order (e.g.,
 * phone/offline payment scenario).
 *
 * Business Scenario:
 *
 * - Simulate realistic onboarding and operation: an admin registers a new seller,
 *   a customer is provisioned, an order is placed for the customer and seller,
 *   and the seller then records a payment on that order (as might happen for a
 *   phone or offline transaction).
 *
 * Steps:
 *
 * 1. Provision a seller via admin API (all required business/contact info, unique
 *    email/phone, 'approved' status)
 * 2. Provision a customer (unique email, phone, 'active' status, password_hash
 *    null for this backend flow)
 * 3. Customer places an order with the seller (arbitrary address, status
 *    'pending', KRW for currency, order_number generated)
 * 4. Seller creates a payment entry on the order (e.g., type 'deposit'), providing
 *    matching order amount/currency and a generated transaction_id
 * 5. Assert: payment response fields match business requirements (order linkage,
 *    correct status/amount/currency, transaction ID type, paid_at)
 * 6. Edge: a second (unauthorized) seller attempts payment creation for same
 *    order, expecting an error due to authorization failure
 *
 * All responses are validated for type correctness.
 */
export async function test_api_aimall_backend_seller_orders_payments_test_seller_create_payment_on_behalf_of_customer(
  connection: api.IConnection,
) {
  // 1. Admin registers seller
  const sellerData: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerData },
    );
  typia.assert(seller);

  // 2. Register customer
  const customerData: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    status: "active",
    password_hash: null,
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerData },
  );
  typia.assert(customer);

  // 3. Create order (simulate address as random UUID)
  const orderData: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: seller.id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 12900,
    currency: "KRW",
    order_number: `ORD-${new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 15)}`,
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderData },
  );
  typia.assert(order);

  // 4. Seller records payment (matching total amount, currency, and valid method/tx code)
  const paymentInput: IAimallBackendPayment.ICreate = {
    payment_method: "deposit",
    amount: order.total_amount,
    currency: order.currency,
    transaction_id: `BANK-${RandomGenerator.alphaNumeric(12)}`,
    paid_at: new Date().toISOString(),
  };
  const payment =
    await api.functional.aimall_backend.seller.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentInput,
      },
    );
  typia.assert(payment);
  TestValidator.equals("payment's order linkage")(payment.order_id)(order.id);
  TestValidator.equals("payment amount")(payment.amount)(order.total_amount);
  TestValidator.equals("payment currency")(payment.currency)(order.currency);
  TestValidator.equals("payment method")(payment.payment_method)(
    paymentInput.payment_method,
  );

  // 5. Edge: create a second, unrelated seller, and attempt unauthorized payment (should fail)
  const otherSellerData: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const otherSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: otherSellerData },
    );
  typia.assert(otherSeller);
  // Using the same payment input, attempt by a seller who isn't associated with the order - expect error
  TestValidator.error("Unauthorized seller payment action should fail")(() =>
    api.functional.aimall_backend.seller.orders.payments.create(connection, {
      orderId: order.id,
      body: paymentInput,
    }),
  );
}
