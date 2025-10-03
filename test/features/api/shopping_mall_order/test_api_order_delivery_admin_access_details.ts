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
 * Validate that an admin can access the delivery details of any order (even
 * those created by other roles).
 *
 * 1. Register a new admin account, save identity/token
 * 2. Register a customer, save identity and token
 * 3. As customer, create a shopping cart with the same channel/section
 * 4. Switch to admin, create an order that links to the customer and the cart;
 *    include at least one order item, payment, and delivery (satisfying the DTO
 *    requirements)
 * 5. As customer, create a delivery record for that order using required fields
 *    (recipient/contact/address, etc)
 * 6. Switch to admin, fetch the delivery details by orderId/deliveryId, and verify
 *    all key business fields (recipient_name, recipient_phone,
 *    address_snapshot, delivery_status, delivery_attempts, order and shipment
 *    references, timestamps, etc)
 * 7. Attempt to fetch a non-existent deliveryId and confirm error handling and
 *    cross-role access (TestValidator.error, proper await usage)
 */
export async function test_api_order_delivery_admin_access_details(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Customer creates cart
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 4. Admin creates order (linking customer and cart)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderCreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: "to-be-set", // will adjust after order creation if needed
        shopping_mall_product_id: productId,
        shopping_mall_seller_id: sellerId,
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        status: "ordered",
      } as unknown as IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [],
    payments: [
      {
        shopping_mall_order_id: "set-later", // adjust after order creation if needed
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        status: "pending",
        amount: 10000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      } as unknown as IShoppingMallPayment.ICreate,
    ],
  } satisfies IShoppingMallOrder.ICreate;
  // Remove the to-be-set ids after order is created as response DTO will have proper item ids
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderCreate,
    },
  );
  typia.assert(order);

  // 5. As customer, create a delivery record for the order
  const deliveryCreate = {
    shopping_mall_order_id: order.id,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
    delivery_message: "Leave at the door if possible",
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: deliveryCreate,
      },
    );
  typia.assert(delivery);

  // 6. As admin, fetch delivery details
  const deliveryDetails =
    await api.functional.shoppingMall.admin.orders.deliveries.at(connection, {
      orderId: order.id,
      deliveryId: delivery.id,
    });
  typia.assert(deliveryDetails);
  TestValidator.equals(
    "fetched delivery matches newly created delivery",
    deliveryDetails.id,
    delivery.id,
  );
  TestValidator.equals(
    "recipient name matches",
    deliveryDetails.recipient_name,
    deliveryCreate.recipient_name,
  );
  TestValidator.equals(
    "recipient phone matches",
    deliveryDetails.recipient_phone,
    deliveryCreate.recipient_phone,
  );
  TestValidator.equals(
    "address snapshot matches",
    deliveryDetails.address_snapshot,
    deliveryCreate.address_snapshot,
  );
  TestValidator.equals(
    "delivery status matches",
    deliveryDetails.delivery_status,
    deliveryCreate.delivery_status,
  );
  TestValidator.equals(
    "order ID matches",
    deliveryDetails.shopping_mall_order_id,
    deliveryCreate.shopping_mall_order_id,
  );

  // 7. Attempt to fetch non-existent delivery
  await TestValidator.error(
    "fetching non-existent delivery ID throws error",
    async () => {
      await api.functional.shoppingMall.admin.orders.deliveries.at(connection, {
        orderId: order.id,
        deliveryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
