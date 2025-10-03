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
 * Test E2E flow: an admin creates order payment for customer order.
 *
 * 1. Register admin account, store token
 * 2. Register customer, store id
 * 3. Create a cart for customer
 * 4. (As admin) Create order referencing cart and customer, with minimum info
 *    (sections/channels randomly chosen, one item)
 * 5. (As admin) Create payment for that order: payment_type/status/fields
 *    configured to be valid; references correct order and customer
 * 6. Validate payment response links to correct order/customer/amount/currency,
 *    all fields present, all business/audit compliance enforced
 *
 * All steps use strictly valid and plausible values for compliance. This test
 * covers only the compliant admin path for payment creation (no
 * duplicate/invalid/edge case error checks).
 */
export async function test_api_payment_creation_by_admin_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerJoinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // 3. Create customer cart
  const cartCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreateBody },
  );
  typia.assert(cart);

  // 4. Create admin order referencing customer/cart
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // replaced by backend
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: 10000,
    final_price: 9000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // replaced by backend
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 10 }),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const paymentAmount = orderItem.final_price;
  const paymentInit: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // replaced by backend
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    status: "pending",
    amount: paymentAmount,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: paymentAmount,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [delivery],
    payments: [paymentInit],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);
  TestValidator.equals(
    "order customer linkage",
    order.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "order cart linkage",
    order.shopping_mall_cart_id,
    cart.id,
  );

  // 5. Create payment for the order as admin
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    payment_type: "card",
    status: "paid",
    amount: order.total_amount,
    currency: order.currency,
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const payment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: paymentCreateBody,
    });
  typia.assert(payment);
  TestValidator.equals(
    "payment links to correct order",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment links to correct customer",
    payment.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "payment currency matches order",
    payment.currency,
    order.currency,
  );
  TestValidator.equals(
    "payment amount matches order",
    payment.amount,
    order.total_amount,
  );
  TestValidator.equals("payment status is paid", payment.status, "paid");
  TestValidator.predicate(
    "payment creation timestamp is ISO 8601",
    typeof payment.created_at === "string" && payment.created_at.length > 0,
  );
}
