import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that a customer can update delivery info on their own order before
 * shipment.
 *
 * Workflow:
 *
 * 1. Register admin
 * 2. Admin creates channel
 * 3. Register customer for that channel
 * 4. Customer creates cart
 * 5. Admin creates order for that cart/customer
 * 6. Customer creates delivery for order
 * 7. Customer updates delivery details prior to shipment
 *    (address/recipient/message)
 * 8. Confirm update is reflected; verify audit (changed vs. original values)
 * 9. Change delivery status to 'delivered', then attempt update (should error)
 */
export async function test_api_order_delivery_customer_update(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "supersecurepw",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Channel registration
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "customerpw",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 4. Customer creates cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 5. Admin creates order for that cart/customer (with dummy order items/payment/delivery)
  const orderItem = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 9000,
    discount_snapshot: null,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;

  const payment = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    status: "paid",
    amount: 9000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const deliveryCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 10 }),
    delivery_message: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallDelivery.ICreate;

  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: cart.shopping_mall_section_id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 9000,
        currency: "KRW",
        order_items: [orderItem],
        deliveries: [deliveryCreate],
        payments: [payment],
        after_sale_services: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Find the delivery just created (assume first delivery)
  const preDelivery = order.deliveries?.[0];
  typia.assert(preDelivery);

  // 6. Customer creates delivery (the API expects a POST after admin-order creation)
  const newDelivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          address_snapshot: RandomGenerator.paragraph({ sentences: 10 }),
          delivery_message: RandomGenerator.paragraph(),
          delivery_status: "prepared",
          delivery_attempts: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallDelivery.ICreate,
      },
    );
  typia.assert(newDelivery);

  // 7. Customer updates delivery info before shipment
  const updateInput = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 15 }),
    delivery_message: RandomGenerator.paragraph({ sentences: 3 }),
    delivery_status: "prepared",
    confirmed_at: undefined,
    delivery_attempts: (newDelivery.delivery_attempts + 1) as number &
      tags.Type<"int32">,
  } satisfies IShoppingMallDelivery.IUpdate;

  const updated =
    await api.functional.shoppingMall.customer.orders.deliveries.update(
      connection,
      {
        orderId: order.id,
        deliveryId: newDelivery.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals("delivery is updated", newDelivery, updated);
  TestValidator.equals(
    "updated recipient name is correct",
    updated.recipient_name,
    updateInput.recipient_name,
  );
  TestValidator.equals(
    "updated phone is correct",
    updated.recipient_phone,
    updateInput.recipient_phone,
  );
  TestValidator.equals(
    "updated address snapshot is correct",
    updated.address_snapshot,
    updateInput.address_snapshot,
  );
  TestValidator.equals(
    "updated delivery message is correct",
    updated.delivery_message,
    updateInput.delivery_message,
  );

  // 8. Change status to 'delivered' (simulate by updating delivery)
  const deliveredUpdate = {
    recipient_name: updated.recipient_name,
    recipient_phone: updated.recipient_phone,
    address_snapshot: updated.address_snapshot,
    delivery_message: updated.delivery_message,
    delivery_status: "delivered",
    confirmed_at: new Date().toISOString(),
    delivery_attempts: updated.delivery_attempts,
  } satisfies IShoppingMallDelivery.IUpdate;
  const delivered =
    await api.functional.shoppingMall.customer.orders.deliveries.update(
      connection,
      {
        orderId: order.id,
        deliveryId: newDelivery.id,
        body: deliveredUpdate,
      },
    );
  typia.assert(delivered);
  TestValidator.equals(
    "delivery status is delivered",
    delivered.delivery_status,
    "delivered",
  );

  // 9. Attempt to update after delivery is finalized; expect business error
  await TestValidator.error(
    "should not allow update after delivered",
    async () => {
      await api.functional.shoppingMall.customer.orders.deliveries.update(
        connection,
        {
          orderId: order.id,
          deliveryId: newDelivery.id,
          body: {
            ...updateInput,
            delivery_status: "delivered",
          },
        },
      );
    },
  );
}
