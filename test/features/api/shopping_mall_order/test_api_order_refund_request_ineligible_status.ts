import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

/**
 * Validates that refund requests are rejected for ineligible orders due to
 * improper payment status, delivery state, or business rules.
 *
 * 1. Register a new customer account (with a valid initial address).
 * 2. Create an immutable order address snapshot for use in the order.
 * 3. Create an order payment method snapshot for the order (admin API).
 * 4. Create a new order for the customer with the address & payment method (order
 *    remains unpaid).
 * 5. Attempt to request a refund for the order (expected to fail since the order
 *    is unpaid/ineligible).
 * 6. Confirm that the refund API responds with an error, enforcing the refund
 *    business policy.
 */
export async function test_api_order_refund_request_ineligible_status(
  connection: api.IConnection,
) {
  // 1. Register customer with initial address
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphabets(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // 2. Create order address snapshot
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: "03187",
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressBody },
    );
  typia.assert(orderAddress);

  // 3. Create order payment method (admin API)
  const paymentMethodBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 4. Create an order (leave unpaid)
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order should be unpaid (refund ineligible)",
    order.paid_at === null || order.paid_at === undefined,
  );

  // 5. Attempt to request a refund for the ineligible order (expected error)
  const refundBody = {
    orderId: order.id,
    reason_code: "customer_cancel",
    refund_amount: order.order_total,
    currency: order.currency,
    explanation: "Test ineligible refund scenario",
  } satisfies IShoppingMallOrderRefund.ICreate;
  await TestValidator.error(
    "refund request for unpaid/ineligible order should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.orders.refunds.create(
        connection,
        {
          orderId: order.id,
          body: refundBody,
        },
      );
    },
  );
}
