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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Seller can view their own delivery details and cannot access unrelated
 * deliveries.
 *
 * 1. Register admin and create a channel
 * 2. Register a seller in that channel and section
 * 3. Register a customer in that channel
 * 4. Customer creates a cart in that channel/section
 * 5. Admin creates an order for that cart (with order and order item info)
 * 6. Customer adds a delivery for that order
 * 7. Seller fetches delivery details by orderId and deliveryId
 *
 *    - Validate recipient name, phone, address_snapshot, status, etc.
 * 8. Seller tries access to delivery for unrelated order/delivery, assert error
 */
export async function test_api_order_delivery_seller_access_details(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPass123",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Register seller (simulate section with same as channel ID)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPass123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: channel.id, // No section API, so simulate as channel.id
      profile_name: RandomGenerator.name(),
      kyc_status: "verified",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "customerPass123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 5. Customer creates a cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: channel.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 6. Admin creates order for customer (simulate single product, simple order)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: channel.id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: null,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "", // will be ignored on creation, server assigns
            shopping_mall_product_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_product_variant_id: null,
            shopping_mall_seller_id: seller.id,
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            discount_snapshot: null,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [],
        payments: [],
        after_sale_services: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Customer creates delivery entry for the order
  const recipientName = RandomGenerator.name();
  const recipientPhone = RandomGenerator.mobile();
  const addressSnapshot = RandomGenerator.paragraph();
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_shipment_id: undefined,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          address_snapshot: addressSnapshot,
          delivery_message: RandomGenerator.paragraph(),
          delivery_status: "prepared",
          delivery_attempts: 1,
        } satisfies IShoppingMallDelivery.ICreate,
      },
    );
  typia.assert(delivery);

  // 8. Seller retrieves the delivery
  // Simulate seller context (token in connection)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPass123",
      name: seller.profile_name,
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: channel.id,
      profile_name: seller.profile_name,
      kyc_status: seller.kyc_status,
    } satisfies IShoppingMallSeller.IJoin,
  });

  const got = await api.functional.shoppingMall.seller.orders.deliveries.at(
    connection,
    {
      orderId: order.id,
      deliveryId: delivery.id,
    },
  );
  typia.assert(got);
  TestValidator.equals(
    "recipient name matches",
    got.recipient_name,
    recipientName,
  );
  TestValidator.equals(
    "recipient phone matches",
    got.recipient_phone,
    recipientPhone,
  );
  TestValidator.equals(
    "address snapshot matches",
    got.address_snapshot,
    addressSnapshot,
  );
  TestValidator.equals("delivery status", got.delivery_status, "prepared");
  TestValidator.equals(
    "delivery order id",
    got.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("delivery id matches", got.id, delivery.id);

  // 9. Negative test - seller cannot access unrelated delivery
  const anotherDeliveryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "seller cannot access unrelated delivery",
    async () => {
      await api.functional.shoppingMall.seller.orders.deliveries.at(
        connection,
        {
          orderId: order.id,
          deliveryId: anotherDeliveryId,
        },
      );
    },
  );
}
