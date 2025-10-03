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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate that a seller can see delivery information for their own items only.
 * Ensure role-based access and privacy enforcement for delivery details.
 *
 * Steps:
 *
 * 1. Register a seller for a generated channel/section.
 * 2. Register a customer in the same channel.
 * 3. Create a cart for the customer for that channel/section.
 * 4. Via admin, create an order based on that cart, add one order_item for seller.
 *    Add at least one delivery entry to the order.
 * 5. As the seller, use api.functional.shoppingMall.seller.orders.deliveries.at to
 *    get delivery details.
 * 6. Validate delivery matches - id, order_id, recipient fields.
 * 7. (Optional/edge) Test negative: try to fetch a delivery unrelated to the
 *    seller, confirm forbidden.
 */
export async function test_api_delivery_detail_access_for_seller(
  connection: api.IConnection,
) {
  // Generate shared identifiers for channel and section
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();

  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphabets(12);
  const sellerName = RandomGenerator.name();
  const profileName = RandomGenerator.name(2);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      name: sellerName,
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      profile_name: profileName,
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(10);
  const customerName = RandomGenerator.name();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: customerPassword,
      name: customerName,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Switch to customer context (token set automatically)

  // 3. Customer creates cart
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

  // 4. Admin creates an order referencing the above cart, with order_items and delivery
  // Fake a product UUID for seller (since no product API present)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const orderItems = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be ignored
      shopping_mall_product_id: productId,
      shopping_mall_seller_id: seller.id,
      quantity: 1,
      unit_price: 1000,
      final_price: 900,
      status: "ordered",
    } satisfies IShoppingMallOrderItem.ICreate,
  ];
  const deliveryRecipient = RandomGenerator.name();
  const deliveryPhone = RandomGenerator.mobile();
  const addressSnapshot = RandomGenerator.paragraph();
  const deliveries = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be overwritten
      recipient_name: deliveryRecipient,
      recipient_phone: deliveryPhone,
      address_snapshot: addressSnapshot,
      delivery_status: "prepared",
      delivery_attempts: 1,
    } satisfies IShoppingMallDelivery.ICreate,
  ];
  const payments = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // will be ignored
      shopping_mall_customer_id: customer.id,
      payment_type: "card",
      status: "paid",
      amount: 900,
      currency: "KRW",
      requested_at: new Date().toISOString(),
    } satisfies IShoppingMallPayment.ICreate,
  ];
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 900,
        currency: "KRW",
        order_items: orderItems.map((item) => ({
          ...item,
          shopping_mall_order_id: "" as any,
        })),
        deliveries: deliveries.map((dl) => ({
          ...dl,
          shopping_mall_order_id: "" as any,
        })),
        payments,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  if (!order.deliveries || order.deliveries.length === 0)
    throw new Error("Order has no deliveries");
  const delivery = order.deliveries[0];

  // 5. Switch to seller (token set automatically when join returns, but refresh for safety)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      name: sellerName,
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      profile_name: profileName,
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // At this stage, connection should be set with seller token

  // 6. Seller accesses delivery detail
  const fetched = await api.functional.shoppingMall.seller.orders.deliveries.at(
    connection,
    {
      orderId: order.id,
      deliveryId: delivery.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "delivery order id matches",
    fetched.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("delivery id matches", fetched.id, delivery.id);
  TestValidator.equals(
    "recipient and address matches",
    fetched.recipient_name,
    delivery.recipient_name,
  );
  TestValidator.equals(
    "recipient phone matches",
    fetched.recipient_phone,
    delivery.recipient_phone,
  );
  TestValidator.equals(
    "address_snapshot",
    fetched.address_snapshot,
    delivery.address_snapshot,
  );

  // 7. Edge: Try fetching a delivery unrelated to the seller (using random UUIDs)
  await TestValidator.error(
    "seller cannot fetch delivery of unrelated order",
    async () => {
      await api.functional.shoppingMall.seller.orders.deliveries.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          deliveryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
