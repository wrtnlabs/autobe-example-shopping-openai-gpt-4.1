import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPayment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate seller payment listing for own order.
 *
 * This E2E test validates that a seller can properly retrieve payment
 * transaction details for their own order. The flow covers end-to-end business
 * steps, including:
 *
 * 1. Seller account registration/onboarding.
 * 2. Customer account registration.
 * 3. Seller creates a product for sale.
 * 4. Customer places an order for the seller's product (requires pre-existing
 *    address, simulated by random uuid).
 * 5. Customer completes payment(s) for the order, including at least two different
 *    types (e.g., credit_card, coupon), paid in full for the order total.
 * 6. As the seller, retrieve the list of payment transactions for the order with
 *    GET /seller/orders/{orderId}/payments.
 * 7. Validate that the returned payment records:
 *
 * - Contain only payments tied to the given order id
 * - Include all payment types/amounts as supplied in payments
 * - Each payment record's order_id matches the test order id
 * - The amounts sum to the order's total amount
 * - Payment method type(s) are as expected
 *
 * Edge case: multiple payment types per order are supported, test uses both
 * credit_card and coupon for completeness.
 */
export async function test_api_aimall_backend_test_list_order_payments_as_seller_for_own_order(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Seller creates a product
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 4. Customer places an order (with simulated address_id)
  const order_total = 15000;
  const order_currency = "KRW";
  const address_id: string = typia.random<string & tags.Format<"uuid">>();
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id,
        order_status: "pending",
        total_amount: order_total,
        currency: order_currency,
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 5. Customer makes payments (use two payment types: credit_card and coupon)
  const payment1: IAimallBackendPayment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 10000,
          currency: order_currency,
          transaction_id: RandomGenerator.alphaNumeric(12),
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment1);

  const payment2: IAimallBackendPayment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "coupon",
          amount: order_total - 10000,
          currency: order_currency,
          transaction_id: null,
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment2);

  // 6. Seller retrieves payment transactions for the order
  const page: IPageIAimallBackendPayment =
    await api.functional.aimall_backend.seller.orders.payments.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(page);

  // 7. Validate payment transaction details
  const payments = page.data;
  TestValidator.equals("all payments for this order")(
    payments.every((p) => p.order_id === order.id),
  )(true);
  const methods = payments.map((p) => p.payment_method).sort();
  TestValidator.equals("payment methods present")(methods)(
    ["coupon", "credit_card"].sort(),
  );
  TestValidator.equals("amount sum equals order total")(
    payments.reduce((sum, p) => sum + p.amount, 0),
  )(order.total_amount);
}
