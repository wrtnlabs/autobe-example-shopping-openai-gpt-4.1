import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * End-to-end validation that a customer can complete the
 * registration-to-payment workflow for an order in the shopping mall platform.
 *
 * 1. Register a new customer (with address at join).
 * 2. Create an immutable shipping address snapshot for use in orders.
 * 3. Create a payment method snapshot for the order.
 * 4. Place a new order using the created address and payment method.
 * 5. Initiate payment for the order—verifying status, associations, and correct
 *    amount/currency.
 * 6. Attempt to initiate payment for an order (or with payment data) missing a
 *    required association; verify error is thrown.
 * 7. Validate returned objects with typia.assert and business logic between
 *    customer–address–order–payment–payment method.
 */
export async function test_api_customer_order_payment_initiation_end_to_end(
  connection: api.IConnection,
) {
  // 1. Register new customer (with address as part of join)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(6),
      address_line1: RandomGenerator.paragraph({ sentences: 3 }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // 2. Create immutable order address snapshot
  const orderAddressInput = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(6),
    address_main: RandomGenerator.paragraph({ sentences: 4 }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressInput },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot via admin API (test system context)
  const paymentMethodInput = {
    payment_method_type: "card",
    method_data: JSON.stringify({ masked: "**** 1111", brand: "Visa" }),
    display_name: "Visa **** 1111",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodInput },
    );
  typia.assert(paymentMethod);

  // 4. Create a new order, linking address snapshot and payment method
  const orderInput = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 100000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 5. Initiate payment for order with correct associations and status
  const paymentInput = {
    order_payment_method_id: paymentMethod.id,
    payment_ref: RandomGenerator.alphaNumeric(16),
    payment_type: paymentMethod.payment_method_type,
    status: "authorized",
    paid_amount: order.order_total,
    currency: order.currency,
    fail_reason: undefined,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const payment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentInput,
      },
    );
  typia.assert(payment);
  TestValidator.equals(
    "payment's order id matches",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment's method id matches",
    payment.order_payment_method_id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "payment amount matches order",
    payment.paid_amount,
    order.order_total,
  );

  // 6. Edge: Initiate payment with missing/invalid associations (invalid method id)
  await TestValidator.error(
    "should fail with invalid payment method id",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: {
            order_payment_method_id: typia.random<
              string & tags.Format<"uuid">
            >(), // likely random/nonexistent id
            payment_ref: RandomGenerator.alphaNumeric(16),
            payment_type: "card",
            status: "authorized",
            paid_amount: order.order_total,
            currency: order.currency,
            fail_reason: undefined,
          } satisfies IShoppingMallOrderPayment.ICreate,
        },
      );
    },
  );
}
