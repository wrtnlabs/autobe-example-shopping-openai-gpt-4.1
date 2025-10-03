import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test: Seller retrieves shipment batch detail for their assigned order
 *
 * 1. Register a new seller (join)
 * 2. Create a shopping cart (customer/cart, using random UUID as customer)
 * 3. Create an order for the cart, assigning the seller explicitly
 *    (admin/orders.create)
 * 4. Register a shipment batch as the seller, for the created order
 * 5. Retrieve the shipment as the seller and validate all main business fields
 * 6. Attempt retrieval as an unassociated seller (should error)
 * 7. Attempt retrieval of shipmentId/orderId combos that don't exist (should
 *    error)
 *
 * All API calls use proper typia.assert and TestValidator assertions.
 */
export async function test_api_seller_retrieve_order_shipment_detail(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sellerJoinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinReq,
  });
  typia.assert(sellerAuth);
  const seller = sellerAuth.seller!;

  // 2. Create a shopping cart for a customer (simulate customer record)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cartReq = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartReq },
  );
  typia.assert(cart);

  // 3. Create an order (admin) for that cart, assigning the test seller
  const orderItemReq = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, server may ignore
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    quantity: 1,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const paymentReq = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, server may ignore
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const deliveryReq = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, server may ignore
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 5 }),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;
  const orderReq = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItemReq],
    payments: [paymentReq],
    deliveries: [deliveryReq],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderReq },
  );
  typia.assert(order);

  // 4. Register a shipment batch for that order (admin endpoint)
  const shipmentReq = {
    shopping_mall_order_id: order.id,
    shopping_mall_seller_id: seller.id,
    shipment_code: RandomGenerator.alphaNumeric(12),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      { orderId: order.id, body: shipmentReq },
    );
  typia.assert(shipment);

  // 5. Retrieve shipment as the assigned seller and check all fields
  const shipmentDetail =
    await api.functional.shoppingMall.seller.orders.shipments.at(connection, {
      orderId: order.id,
      shipmentId: shipment.id,
    });
  typia.assert(shipmentDetail);
  TestValidator.equals(
    "correct shipment returned",
    shipmentDetail.id,
    shipment.id,
  );
  TestValidator.equals(
    "seller assigned",
    shipmentDetail.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "order assigned",
    shipmentDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "shipment status",
    shipmentDetail.status,
    shipmentReq.status,
  );

  // 6. Register a second seller (should not be able to view this shipment)
  const seller2Auth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    },
  });
  typia.assert(seller2Auth);
  // Now connection is authenticated with seller2

  await TestValidator.error("other seller cannot view shipment", async () => {
    await api.functional.shoppingMall.seller.orders.shipments.at(connection, {
      orderId: order.id,
      shipmentId: shipment.id,
    });
  });

  // 7. Try retrieving with invalid/nonexistent shipmentId or orderId
  await TestValidator.error("invalid shipmentId error", async () => {
    await api.functional.shoppingMall.seller.orders.shipments.at(connection, {
      orderId: order.id,
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  await TestValidator.error("invalid orderId error", async () => {
    await api.functional.shoppingMall.seller.orders.shipments.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      shipmentId: shipment.id,
    });
  });
}
