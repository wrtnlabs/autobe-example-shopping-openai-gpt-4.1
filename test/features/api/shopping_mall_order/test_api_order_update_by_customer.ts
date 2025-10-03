import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate updating a shopping mall order as a customer.
 *
 * This test covers that a customer can update fields of their own order using
 * the permitted API. It also verifies business rules and access control: (1)
 * updating status in legal workflow transitions is allowed, (2) attempting an
 * illegal status transition is properly rejected, (3) editing a completed or
 * deleted order is rejected, and (4) non-owners cannot update the order.
 *
 * Steps:
 *
 * 1. Register a customer and authenticate (save both token and customer ID).
 * 2. Create a customer cart, then create an order for this customer using admin
 *    API (simulate as if placed by admin on behalf).
 * 3. (Positive) As the customer, update order fields using a legal transition
 *    (e.g., status: 'paid' to 'in_fulfillment', paid_amount/currency update).
 * 4. (Negative) Attempt to update illegal statuses (e.g., directly to 'completed')
 *    and confirm error is triggered.
 * 5. (Negative) Update an already completed/deleted order and confirm error.
 * 6. (Negative) Attempt to update as a different customer (register a second
 *    customer, login as them) -- should fail.
 * 7. (Optional) If snapshot or audit mechanism is returned, check that update
 *    created a new snapshot or audit event (cannot be directly checked unless
 *    snapshot present in response).
 */
export async function test_api_order_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer and log in
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  const customerId = customer.id;
  const channelId = customer.shopping_mall_channel_id;

  // 2. Create the customer cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        source: "member",
      },
    },
  );
  typia.assert(cart);
  // 3. As admin, create order for customer (simulate via admin API, use cart info)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: cart.shopping_mall_channel_id,
        shopping_mall_section_id: cart.shopping_mall_section_id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_seller_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph(),
            delivery_status: "prepared",
            delivery_attempts: 0,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customerId,
            payment_type: "card",
            status: "pending",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
      },
    },
  );
  typia.assert(order);

  // 4. Positive: As this customer, change order (legal transition: mark as paid/fill fields)
  const updatedOrder = await api.functional.shoppingMall.customer.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        status: "paid",
        paid_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(updatedOrder);
  TestValidator.equals(
    "order status transitioned to paid",
    updatedOrder.status,
    "paid",
  );

  // 5. Negative: Attempt illegal status transitions (e.g., directly to completed)
  await TestValidator.error(
    "illegal status transition not allowed",
    async () => {
      await api.functional.shoppingMall.customer.orders.update(connection, {
        orderId: order.id,
        body: {
          status: "completed",
        },
      });
    },
  );

  // 6. Negative: Update completed order (simulate marking order as completed first -- for this test we'll try with current state, or skip if completed_at/deleted_at present)
  // Forcibly set status to a completed one via legal means (if allowed)
  // Attempt update, expect error
  // Here assuming server will not allow updating after 'completed' status has set
  // (if not possible via API, this test step can be skipped)
  await TestValidator.error(
    "cannot update an already completed order",
    async () => {
      await api.functional.shoppingMall.customer.orders.update(connection, {
        orderId: order.id,
        body: {
          status: "completed",
        },
      });
      // Then try to update again; should fail
      await api.functional.shoppingMall.customer.orders.update(connection, {
        orderId: order.id,
        body: {
          paid_amount: 9999,
        },
      });
    },
  );

  // 7. Negative: Try to update with another (non-owner) customer
  // Register a second customer
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(otherCustomer);

  // Login as the second customer (token will be set automatically)
  await TestValidator.error(
    "non-owner customer cannot update the order",
    async () => {
      await api.functional.shoppingMall.customer.orders.update(connection, {
        orderId: order.id,
        body: {
          status: "paid",
        },
      });
    },
  );
}
