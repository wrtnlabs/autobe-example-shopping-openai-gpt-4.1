import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Test platform administrator's retrieval of order payment detail.
 *
 * This test verifies the end-to-end scenario where an administrator retrieves
 * detailed payment information about an order. The workflow involves several
 * entities: admin, seller, and a customer. The steps are constructed to ensure
 * that the admin can see all sensitive payment fields for a legitimate
 * order/payment.
 *
 * Steps:
 *
 * 1. Create an administrator account (with full permission - a permission_id will
 *    be spun up with a random UUID).
 * 2. Create a seller account (with unique business name, contact email, and
 *    phone).
 * 3. Simulate a customer placing an order referencing the seller (requires
 *    seller_id, customer_id, address_id, order_number, total_amount,
 *    order_status, currency).
 * 4. Simulate a customer payment event for that order (using order_id, specifying
 *    method, amount, currency, optional transaction_id and paid_at).
 * 5. As administrator, retrieve the payment details using
 *    /administrator/orders/{orderId}/payments/{paymentId} endpoint with the
 *    order and payment UUIDs.
 * 6. Assert that all fields in the response structure are present and correspond
 *    with requested order/payment IDs.
 * 7. Confirm sensitive fields (amount, transaction_id, paid_at) are visible.
 * 8. Edge: Confirm order_id and payment_id in response match input, and admin can
 *    view all sensitive payment details.
 */
export async function test_api_aimall_backend_administrator_orders_payments_test_admin_retrieve_order_payment_success(
  connection: api.IConnection,
) {
  // 1. Create an administrator account
  const adminPermissionId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: adminPermissionId,
          email: adminEmail,
          name: "AdminTestUser",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Create a seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Test Seller LLC",
          email: sellerEmail,
          contact_phone: "010-1234-5678",
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create a fake customer and address (simulate, as no customer/account create API; use random UUIDs).
  const customerId: string = typia.random<string & tags.Format<"uuid">>();
  const addressId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Customer places an order (link to seller, customer, address)
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customerId,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: 29900,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Customer submits a payment for that order
  const payment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: order.total_amount,
          currency: order.currency,
          transaction_id: "PG-ORDER-TX-001",
          paid_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 6. As administrator, retrieve the payment by order/payment ID
  const adminPaymentView =
    await api.functional.aimall_backend.administrator.orders.payments.at(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
      },
    );
  typia.assert(adminPaymentView);

  // 7: Validate fields: all sensitive payment fields visible, and IDs match
  TestValidator.equals("order_id matches")(adminPaymentView.order_id)(order.id);
  TestValidator.equals("payment_id matches")(adminPaymentView.id)(payment.id);
  TestValidator.equals("amount matches")(adminPaymentView.amount)(
    order.total_amount,
  );
  TestValidator.equals("currency matches")(adminPaymentView.currency)(
    order.currency,
  );
  TestValidator.equals("transaction_id matches")(
    adminPaymentView.transaction_id,
  )(payment.transaction_id);
  TestValidator.predicate("paid_at present and format")(
    typeof adminPaymentView.paid_at === "string" &&
      adminPaymentView.paid_at.length > 0,
  );
  TestValidator.equals("payment_method matches")(
    adminPaymentView.payment_method,
  )(payment.payment_method);
}
