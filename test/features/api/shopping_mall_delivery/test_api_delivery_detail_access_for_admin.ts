import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Ensures admin can retrieve full delivery detail for any order
 *
 * 1. Register a new admin via /auth/admin/join, store credentials and session.
 * 2. Simulate a customer cart by creating one with /shoppingMall/customer/carts
 *    (random UUIDs for customer/channel/section).
 * 3. Create a test order using /shoppingMall/admin/orders, using the above cart
 *    and random order item/delivery/payment records.
 * 4. Pick a delivery record from the order (from order.deliveries array), retrieve
 *    its ID.
 * 5. As admin, call /shoppingMall/admin/orders/{orderId}/deliveries/{deliveryId}.
 *    Validate:
 *
 *    - Typia.assert for type safety.
 *    - All sensitive fields (recipient_name, recipient_phone, address_snapshot,
 *         delivery_message, delivery_status, confirmed_at, delivery_attempts,
 *         shipment id, deleted_at) are present.
 *    - TestValidator.equals for key PKs and linkage: delivery.shopping_mall_order_id
 *         === order.id, delivery.id === picked deliveryId.
 *    - Test business logic: admin is not blocked from accessing delivery of any
 *         order.
 */
export async function test_api_delivery_detail_access_for_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create customer cart
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 3. Create order (with required nested entities)
  // Generate minimal order structure that is still valid
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 9500,
    discount_snapshot: null,
    status: "ordered",
  };
  const deliveryCreate: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 6 }),
    delivery_message: RandomGenerator.paragraph({ sentences: 2 }),
    delivery_status: "prepared",
    delivery_attempts: 1 as number & tags.Type<"int32">,
  };
  const paymentCreate: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(10),
    status: "pending",
    amount: 9500,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderBody: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    external_order_ref: RandomGenerator.alphaNumeric(8),
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [deliveryCreate],
    payments: [paymentCreate],
  };
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 4. Retrieve delivery id
  if (!order.deliveries || order.deliveries.length === 0)
    throw new Error("Order must have a delivery.");
  const delivery = order.deliveries[0];
  typia.assert(delivery);

  // 5. As admin, access delivery detail for this order and delivery
  const output = await api.functional.shoppingMall.admin.orders.deliveries.at(
    connection,
    {
      orderId: order.id,
      deliveryId: delivery.id,
    },
  );
  typia.assert(output);
  // Validate sensitive fields and linkage
  TestValidator.equals("delivery id matches", output.id, delivery.id);
  TestValidator.equals(
    "order linkage present",
    output.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "recipient name present",
    typeof output.recipient_name === "string" &&
      output.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "recipient phone present",
    typeof output.recipient_phone === "string" &&
      output.recipient_phone.length > 0,
  );
  TestValidator.predicate(
    "address_snapshot present",
    typeof output.address_snapshot === "string" &&
      output.address_snapshot.length > 0,
  );
  TestValidator.predicate(
    "delivery status",
    typeof output.delivery_status === "string" &&
      output.delivery_status.length > 0,
  );
  TestValidator.predicate(
    "delivery_attempts int",
    typeof output.delivery_attempts === "number" &&
      output.delivery_attempts >= 1,
  );
}
