import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test updating a failed payment for a customer order.
 *
 * 1. Register and login a new customer
 * 2. Register and login a new admin
 * 3. Customer creates a shipping address snapshot
 * 4. Admin creates a new order payment method snapshot
 * 5. Customer places an order using the shipping address and payment method
 * 6. Customer initiates a payment for the order with 'failed' status
 * 7. Customer retries payment by updating the payment entry to 'pending' or a
 *    different valid status
 * 8. Validate that the update reflects in the payment record, and business logic
 *    applies
 * 9. Attempt to update payment with disallowed transitions (e.g., to 'refunded')
 *    to ensure errors are thrown
 */
export async function test_api_customer_order_payment_update_after_failed_transaction(
  connection: api.IConnection,
) {
  // 1. Register and login a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerFullName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customerAddress: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: "Seoul",
    postal_code: "12345",
    address_line1: RandomGenerator.paragraph(),
    address_line2: null,
    is_default: true,
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      full_name: customerFullName,
      phone: customerPhone,
      address: customerAddress,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);

  // 2. Register and login a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 3. Customer creates a shipping address snapshot for an order
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customerAddress.recipient_name,
          phone: customerAddress.phone,
          zip_code: customerAddress.postal_code,
          address_main: customerAddress.address_line1,
          address_detail: customerAddress.address_line2,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Admin creates a payment method snapshot for the order
  // (Switch to admin connection)
  const orderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: "visa ****9876",
          display_name: "Visa ending 9876",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(orderPaymentMethod);

  // 5. Customer places an order
  const orderTotal = 15000;
  const currency = "KRW";
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: orderPaymentMethod.id,
        order_total: orderTotal,
        currency,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Customer initiates a payment for the order with status 'failed'
  const failReason = "Transaction declined: insufficient funds";
  const payment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_payment_method_id: orderPaymentMethod.id,
          payment_ref: RandomGenerator.alphaNumeric(12),
          payment_type: "card",
          status: "failed",
          paid_amount: orderTotal,
          currency,
          fail_reason: failReason,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(payment);
  TestValidator.equals("payment should be failed", payment.status, "failed");

  // 7. Customer retries payment by updating the failed payment
  const updatedRef = RandomGenerator.alphaNumeric(14);
  const updatePayload = {
    payment_ref: updatedRef,
    payment_type: "card",
    status: "pending",
    fail_reason: undefined,
    paid_amount: orderTotal,
    currency,
  } satisfies IShoppingMallOrderPayment.IUpdate;
  const updated =
    await api.functional.shoppingMall.customer.orders.payments.update(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "payment status after update should be pending",
    updated.status,
    "pending",
  );
  TestValidator.equals(
    "update should change payment_ref",
    updated.payment_ref,
    updatedRef,
  );

  // 8. Attempt to update payment to an invalid status to ensure error
  await TestValidator.error(
    "should throw error on disallowed status transition",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.update(
        connection,
        {
          orderId: order.id,
          paymentId: payment.id,
          body: {
            status: "refunded",
          } satisfies IShoppingMallOrderPayment.IUpdate,
        },
      );
    },
  );
}
