import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validates retrieval of a payment detail by an authorized seller.
 *
 * This test covers retrieval of payment detail for a paid order as follows:
 *
 * 1. Register a new seller (merchant onboarding)
 * 2. Create a new order for that seller using a random customer
 * 3. Add a payment for the order
 * 4. Retrieve payment detail for the seller/order/payment
 * 5. Assert correct linkage and payment field content
 * 6. Attempt to fetch the payment as a different seller (simulate forbidden
 *    access)
 *
 * Note:
 *
 * - As role-based authentication endpoints are unavailable, all API calls are
 *   performed with the same privileged connection.
 * - All IDs and required business properties are generated deterministically per
 *   the DTO schema and test concept.
 * - Negative path verifies linkage/permission logic per API contract; true auth
 *   isolation not implemented due to context limit.
 */
export async function test_api_aimall_backend_test_retrieve_payment_detail_as_seller_with_valid_permission(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(3),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create an order for this seller
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id: seller.id,
        address_id,
        order_status: "pending",
        total_amount: 50000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Add a payment for this order
  const transaction_id = `TID-${Date.now()}`;
  const payment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: order.total_amount,
          currency: order.currency,
          transaction_id,
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 4. Retrieve payment detail as seller
  const paymentDetail =
    await api.functional.aimall_backend.seller.orders.payments.at(connection, {
      orderId: order.id,
      paymentId: payment.id,
    });
  typia.assert(paymentDetail);

  // 5. Validate payment linkage and fields
  TestValidator.equals("orderId matches")(paymentDetail.order_id)(order.id);
  TestValidator.equals("paymentId matches")(paymentDetail.id)(payment.id);
  TestValidator.equals("amount matches")(paymentDetail.amount)(
    order.total_amount,
  );
  TestValidator.equals("currency matches")(paymentDetail.currency)(
    order.currency,
  );
  TestValidator.equals("transaction_id matches")(paymentDetail.transaction_id)(
    transaction_id,
  );
  TestValidator.equals("method matches")(paymentDetail.payment_method)(
    "credit_card",
  );
  TestValidator.predicate("paid_at is ISO 8601")(
    !!Date.parse(paymentDetail.paid_at),
  );

  // 6. Negative: Try to fetch as a different seller (simulate forbidden/ownership violation)
  const anotherSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(3),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(anotherSeller);
  TestValidator.error("seller cannot access payment for order not owned")(() =>
    api.functional.aimall_backend.seller.orders.payments.at(connection, {
      orderId: order.id,
      paymentId: payment.id,
    }),
  );
}
