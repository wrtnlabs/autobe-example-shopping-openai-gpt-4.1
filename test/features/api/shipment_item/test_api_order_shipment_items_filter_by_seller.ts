import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";

/**
 * Test seller's retrieval, filtering, and pagination of shipment items for an
 * order/shipment.
 *
 * Validates that the seller only sees shipment items they are authorized for,
 * tests filter by referenced order item, product, and fulfillment status where
 * applicable, checks pagination, and asserts business meta and access
 * restriction. Steps:
 *
 * 1. Register a seller (join via /auth/seller/join)
 * 2. Admin creates an order (with relevant seller info and at least two order
 *    items for that seller)
 * 3. Admin creates a shipment batch for that order, for the seller
 * 4. (Optional) Add items to the shipment if not already auto-attached
 * 5. Seller lists shipment items using
 *    /shoppingMall/seller/orders/{orderId}/shipments/{shipmentId}/items
 *    (PATCH), tests various permutations: a. Unfiltered (default page, expect
 *    to get all records related to this shipment, 20 per default) b.
 *    Pagination: page=2, limit=N c. Filter by specific order_item_id (should
 *    return only that record) d. (If product_id available in schema/filter)
 *    filter by that product e. (If status available) filter by status
 * 6. Negative: Seller tries accessing another order/shipment they have no access
 *    to (expect error).
 * 7. Validate response business meta for pagination, data shape, and contents.
 */
export async function test_api_order_shipment_items_filter_by_seller(
  connection: api.IConnection,
) {
  // REGISTER SELLER
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      phone: RandomGenerator.mobile(),
      profile_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // CREATE ORDER (ADMIN, multi-item)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const productIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const orderItems: IShoppingMallOrderItem.ICreate[] = productIds.map(
    (pid, i) => ({
      shopping_mall_order_id: "",
      shopping_mall_product_id: pid,
      shopping_mall_seller_id: seller.id,
      quantity: 2,
      unit_price: 1000 + i * 500,
      final_price: 1000 + i * 500,
      status: "ordered",
    }),
  );
  // order_id set by parent order
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: "",
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  };
  const payment: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: "",
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    status: "pending",
    amount: 2000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    order_type: "normal",
    total_amount: 2000,
    currency: "KRW",
    order_items: orderItems,
    deliveries: [delivery],
    payments: [payment],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);
  TestValidator.equals("order has 2 items", order.order_items?.length, 2);

  // CREATE SHIPMENT batch for seller
  const shipmentCreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_seller_id: seller.id,
    shipment_code: RandomGenerator.alphaNumeric(10),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      { orderId: order.id, body: shipmentCreate },
    );
  typia.assert(shipment);

  // SELLER QUERIES SHIPMENT ITEMS (various filters)
  // a. Unfiltered, default pagination
  const shipmentItemsPage1 =
    await api.functional.shoppingMall.seller.orders.shipments.items.index(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {} satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(shipmentItemsPage1);
  TestValidator.equals(
    "shipment items relate to shipment",
    shipmentItemsPage1.data.every(
      (item) => item.shopping_mall_shipment_id === shipment.id,
    ),
    true,
  );
  TestValidator.equals(
    "shipment items count consistent with order items",
    shipmentItemsPage1.data.length,
    order.order_items?.length,
  );
  TestValidator.equals(
    "pagination limit default",
    shipmentItemsPage1.pagination.limit,
    20,
  );

  // b. Page 2 (should return 0 as only a few items)
  const shipmentItemsPage2 =
    await api.functional.shoppingMall.seller.orders.shipments.items.index(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: { page: 2 } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(shipmentItemsPage2);
  TestValidator.equals(
    "no shipment items on page 2",
    shipmentItemsPage2.data.length,
    0,
  );

  // c. Filter by specific order_item_id
  const orderItemToFilter = typia.assert(order.order_items?.[0]!);
  const itemsByOrderItem =
    await api.functional.shoppingMall.seller.orders.shipments.items.index(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          order_item_id: orderItemToFilter.id,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(itemsByOrderItem);
  TestValidator.equals(
    "items filtered by order_item_id",
    itemsByOrderItem.data.every(
      (item) => item.shopping_mall_order_item_id === orderItemToFilter.id,
    ),
    true,
  );

  // d. Filter by product_id
  const itemsByProduct =
    await api.functional.shoppingMall.seller.orders.shipments.items.index(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          product_id: orderItemToFilter.shopping_mall_product_id,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(itemsByProduct);
  TestValidator.equals(
    "items filtered by product_id",
    itemsByProduct.data.every(
      (item) => item.shopping_mall_order_item_id === orderItemToFilter.id,
    ),
    true,
  );

  // e. Filter by status (if shipment items have business status)
  // status field may not actually map, but demonstrate presence for negative value
  const itemsByFakeStatus =
    await api.functional.shoppingMall.seller.orders.shipments.items.index(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          status: "nonexistentstatus",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(itemsByFakeStatus);
  TestValidator.equals(
    "no items for nonexistent status",
    itemsByFakeStatus.data.length,
    0,
  );

  // Neg: Seller tries another random shipmentId (should fail)
  const anotherShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "seller forbidden from accessing shipment they don't manage",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.items.index(
        connection,
        {
          orderId: order.id,
          shipmentId: anotherShipmentId,
          body: {} satisfies IShoppingMallShipmentItem.IRequest,
        },
      );
    },
  );
}
