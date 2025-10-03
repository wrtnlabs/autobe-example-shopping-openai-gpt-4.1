import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate admin retrieval of payment detail for an order.
 *
 * This test validates that an admin user can retrieve payment details for a
 * specific order. It covers authentication, required entity creation (customer,
 * cart, order, payment), and ensures that the returned payment detail is
 * accurate and accessible only with admin privilege.
 *
 * Steps:
 *
 * 1. Register an admin account.
 * 2. Register a customer account.
 * 3. Create a shopping cart for the customer.
 * 4. Create an order (via admin endpoint) based on the customer cart.
 * 5. Create a payment for the order using admin endpoint.
 * 6. Retrieve the payment detail via admin endpoint and verify correctness.
 */
export async function test_api_payment_detail_admin_authorized_success(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  // 2. Register customer
  const customerJoinInput = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customer);
  // 3. Create cart for customer
  const cartBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert(cart);
  // 4. Create order via admin endpoint (simulate minimum required for create)
  // Generate dummy order items so that the order can be created.
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: 10000,
    final_price: 10000,
    discount_snapshot: null,
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: undefined,
    delivery_status: "prepared",
    delivery_attempts: 1,
  };
  // Use paymentType/card and typical values for payment
  const now = new Date().toISOString();
  const paymentCreate: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(16),
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: now,
  };
  const orderCreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [paymentCreate],
    after_sale_services: undefined,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);
  TestValidator.equals(
    "order customer id",
    order.shopping_mall_customer_id,
    customer.id,
  );
  // 5. Create payment for the order (simulate as if new payment, but actually satisfies the API requirement)
  const paymentInput: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(16),
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const payment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: paymentInput,
    });
  typia.assert(payment);
  // 6. Retrieve payment detail as admin
  const detail = await api.functional.shoppingMall.admin.orders.payments.at(
    connection,
    {
      orderId: order.id,
      paymentId: payment.id,
    },
  );
  typia.assert(detail);
  // Business verification: retrieved payment matches created payment
  TestValidator.equals("payment id matches", detail.id, payment.id);
  TestValidator.equals(
    "payment order id matches",
    detail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("payment amount matches", detail.amount, payment.amount);
  TestValidator.equals("payment status matches", detail.status, payment.status);
}
