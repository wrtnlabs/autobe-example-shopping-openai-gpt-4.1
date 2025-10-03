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
 * Validates admin-driven payment status transitions and audit compliance.
 *
 * This E2E test verifies that an admin can update an order payment's
 * status—confirming, refunding, etc.—via the admin API, with business-rule
 * enforcement and audit trail preservation.
 *
 * 1. Register an admin and authenticate (capture tokens for admin context).
 * 2. Register a customer.
 * 3. Create a shopping cart for the customer in a random channel/section.
 * 4. Create a new order from the cart (as admin) with order items, delivery, and
 *    payments referencing valid DTOs.
 * 5. Create a payment for the new order, initially set to 'pending' status.
 * 6. Update the payment status to a valid new state (e.g., 'confirmed',
 *    'refunded') using the admin API.
 * 7. Assert that status is updated and that mutable audit fields (updated_at) are
 *    updated accordingly.
 * 8. Attempt an invalid status transition (e.g., from 'refunded' back to
 *    'pending'); confirm the API rejects it and returns a clear error (using
 *    TestValidator.error).
 * 9. Test other mutation fields (external_payment_ref, amount, currency) to
 *    confirm update is possible when business rules allow.
 */
export async function test_api_payment_update_by_admin_status_change(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Customer registration
  const customerJoinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);

  // 3. Create cart (as customer) - ensure all linkage IDs are valid
  const cartCreateBody = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_channel_id: customerAuth.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreateBody },
  );
  typia.assert(cart);

  // 4. Create order (as admin) - using valid cart, channel, section, and customer
  const orderCreateBody = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    // Simple order item referencing random UUIDs for product and seller
    order_items: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_product_variant_id: null,
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        discount_snapshot: null,
        status: "ordered",
      },
    ],
    deliveries: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_shipment_id: undefined,
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
        delivery_message: undefined,
        delivery_status: "prepared",
        delivery_attempts: 0,
      },
    ],
    payments: [],
    after_sale_services: undefined,
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);

  // 5. Create payment (pending)
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(16),
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const payment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: paymentCreateBody,
    });
  typia.assert(payment);

  // 6. Update payment status to 'confirmed'
  const updateBodyConfirmed = {
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;
  const updatedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: order.id,
      paymentId: payment.id,
      body: updateBodyConfirmed,
    });
  typia.assert(updatedPayment);
  TestValidator.equals(
    "admin updated payment status to confirmed",
    updatedPayment.status,
    "confirmed",
  );
  TestValidator.predicate(
    "updated_at timestamp updated after status change",
    Date.parse(updatedPayment.updated_at) >= Date.parse(payment.updated_at),
  );

  // 7. Try illegal transition (confirmed to pending - forbidden)
  const updateBodyIllegal = {
    status: "pending",
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;
  await TestValidator.error(
    "illegal payment status transition is rejected",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.update(
        connection,
        { orderId: order.id, paymentId: payment.id, body: updateBodyIllegal },
      );
    },
  );

  // 8. Refund flow (confirmed -> refunded)
  const updateBodyRefunded = {
    status: "refunded",
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;
  const refundedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: order.id,
      paymentId: payment.id,
      body: updateBodyRefunded,
    });
  typia.assert(refundedPayment);
  TestValidator.equals(
    "admin changed payment status to refunded",
    refundedPayment.status,
    "refunded",
  );

  // 9. Try another illegal transition (refunded to confirmed - forbidden)
  const updateBodyBackToConfirmed = {
    status: "confirmed",
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;
  await TestValidator.error(
    "cannot move refunded payment to confirmed",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.update(
        connection,
        {
          orderId: order.id,
          paymentId: payment.id,
          body: updateBodyBackToConfirmed,
        },
      );
    },
  );

  // 10. Valid mutation of mutable fields (external_payment_ref, amount, currency)
  const updateBodyMutable = {
    external_payment_ref: RandomGenerator.alphaNumeric(12),
    amount: 9000,
    currency: "KRW",
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;
  const mutatedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: order.id,
      paymentId: payment.id,
      body: updateBodyMutable,
    });
  typia.assert(mutatedPayment);
  TestValidator.equals(
    "external_payment_ref changed on mutation",
    mutatedPayment.external_payment_ref,
    updateBodyMutable.external_payment_ref,
  );
  TestValidator.equals(
    "amount changed on payment mutation",
    mutatedPayment.amount,
    updateBodyMutable.amount,
  );
}
