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
 * E2E test for admin payment detail retrieval full flow.
 *
 * 1. Register an admin
 * 2. Register a customer (with basic address)
 * 3. As customer, create a snapshot shipping address for order
 * 4. As admin, create a payment method snapshot for the order
 * 5. As customer, create an order (using the shipping address and payment method)
 * 6. As customer, create/initiate a payment for the order
 * 7. As admin, retrieve payment details for the order/payment via admin endpoint
 * 8. Validate returned payment details against submitted/payment data
 */
export async function test_api_admin_order_payment_detail_access_full_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adm!nPassw0rd#",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer registration (has default address automatically)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "custPassw0rd#1",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: "Seoul",
          postal_code: "03187",
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        },
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. As customer, create order address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: "03187",
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. As admin, create payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: "Test Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. As customer, create order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 49900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. As customer, initiate payment for the order
  const payment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_payment_method_id: paymentMethod.id,
          payment_ref: RandomGenerator.alphaNumeric(16),
          payment_type: paymentMethod.payment_method_type,
          status: "captured",
          paid_amount: order.order_total,
          currency: order.currency,
          fail_reason: undefined,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 7. As admin, retrieve payment details
  const paymentDetail: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.admin.orders.payments.at(connection, {
      orderId: order.id,
      paymentId: payment.id,
    });
  typia.assert(paymentDetail);
  TestValidator.equals(
    "admin retrieves matching payment detail for order",
    paymentDetail.id,
    payment.id,
  );
  TestValidator.equals(
    "payment detail order_id matches",
    paymentDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment detail method_id matches",
    paymentDetail.order_payment_method_id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "payment detail paid_amount/currency matches",
    paymentDetail.paid_amount,
    payment.paid_amount,
  );
  TestValidator.equals(
    "payment type/status matches",
    paymentDetail.payment_type,
    payment.payment_type,
  );
}
