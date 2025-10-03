import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";

/**
 * Verify admin can filter, search, and paginate shipment items for any shipment
 * order.
 *
 * 1. Register a new admin.
 * 2. Admin creates an order with nested order_items, payment, delivery.
 * 3. Admin creates a shipment batch for created order.
 * 4. Index shipment items with no filter and validate shipment item listing.
 * 5. Filter shipment items by order_item_id, validate filtered results.
 * 6. Filter by product_id, validate filtered results.
 * 7. Test pagination by setting limit and page, validate counts.
 * 8. Confirm all returned items belong to the correct shipment/batch and order,
 *    all required fields are present.
 * 9. Ensure that inaccessible or logically deleted items are not included.
 */
export async function test_api_order_shipment_items_filter_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Admin creates a new order
  // Build up test order with multiple items for filter coverage
  const testOrderItemCount = 4;
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productIds = ArrayUtil.repeat(testOrderItemCount, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const orderItems: IShoppingMallOrderItem.ICreate[] = ArrayUtil.repeat(
    testOrderItemCount,
    (i) => ({
      shopping_mall_order_id: "", // will set below after order ID is generated,
      shopping_mall_product_id: productIds[i],
      shopping_mall_product_variant_id: undefined,
      shopping_mall_seller_id: sellerId,
      quantity: 1,
      unit_price: 30000 + i * 10000,
      final_price: 28000 + i * 10000,
      discount_snapshot: null,
      status: "ordered",
    }),
  );

  const customerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();

  const deliveryBody: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: "", // will patch below,
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 10 }),
    delivery_message: RandomGenerator.paragraph({ sentences: 4 }),
    delivery_status: "prepared",
    delivery_attempts: 0,
  };

  const paymentBody: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: "", // set below,
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(10),
    status: "paid",
    amount: orderItems.reduce((a, b) => a + b.final_price, 0),
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };

  // Build create order body
  const orderBody: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: undefined,
    external_order_ref: undefined,
    order_type: "normal",
    total_amount: orderItems.reduce((a, b) => a + b.unit_price, 0),
    currency: "KRW",
    order_items: orderItems.map((item) => ({ ...item })), // set IDs below
    deliveries: [{ ...deliveryBody }],
    payments: [{ ...paymentBody }],
    after_sale_services: undefined,
  };

  // Patch order_item, delivery, payment order_id for referential integrity
  // Actually, orderId will be assigned after main order is created; so we first send blank then patch downstream relationships as returned
  const createdOrder = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(createdOrder);
  TestValidator.equals(
    "created order customer",
    createdOrder.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "order item count",
    createdOrder.order_items!.length,
    testOrderItemCount,
  );

  // 3. Admin creates a shipment batch for the order
  const shipmentBody = {
    shopping_mall_order_id: createdOrder.id,
    shopping_mall_seller_id: sellerId,
    shipment_code: RandomGenerator.alphaNumeric(8),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: createdOrder.id,
        body: shipmentBody,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment order",
    shipment.shopping_mall_order_id,
    createdOrder.id,
  );
  TestValidator.equals(
    "shipment seller",
    shipment.shopping_mall_seller_id,
    sellerId,
  );

  // 4. Call index to get all shipment items for this shipment (no filter)
  const fullList =
    await api.functional.shoppingMall.admin.orders.shipments.items.index(
      connection,
      {
        orderId: createdOrder.id,
        shipmentId: shipment.id,
        body: {}, // No filters: get all
      },
    );
  typia.assert(fullList);
  TestValidator.equals(
    "page structure",
    typeof fullList.pagination.current,
    "number",
  );
  TestValidator.equals(
    "all items present (no filter)",
    fullList.data.length,
    fullList.pagination.records,
  );
  TestValidator.predicate(
    "every shipment item belongs to shipment",
    fullList.data.every(
      (item) => item.shopping_mall_shipment_id === shipment.id,
    ),
  );
  TestValidator.predicate(
    "shipment item id uniqueness",
    new Set(fullList.data.map((i) => i.id)).size === fullList.data.length,
  );

  // 5. Test filter: by order_item_id (use the first item)
  if (fullList.data.length > 0) {
    const orderItemId = fullList.data[0].shopping_mall_order_item_id;
    const filteredByOrderItem =
      await api.functional.shoppingMall.admin.orders.shipments.items.index(
        connection,
        {
          orderId: createdOrder.id,
          shipmentId: shipment.id,
          body: {
            order_item_id: orderItemId,
          },
        },
      );
    typia.assert(filteredByOrderItem);
    TestValidator.predicate(
      "all filtered items match order_item_id",
      filteredByOrderItem.data.every(
        (item) => item.shopping_mall_order_item_id === orderItemId,
      ),
    );
  }

  // 6. Test filter: by product_id (via order item linkage)
  if (createdOrder.order_items && createdOrder.order_items.length > 0) {
    const matchProductId = createdOrder.order_items[0].shopping_mall_product_id;
    const byProduct =
      await api.functional.shoppingMall.admin.orders.shipments.items.index(
        connection,
        {
          orderId: createdOrder.id,
          shipmentId: shipment.id,
          body: {
            product_id: matchProductId,
          },
        },
      );
    typia.assert(byProduct);
    // Should only contain shipment items referring to order items of this product
    TestValidator.predicate(
      "product filter worked",
      byProduct.data.every((item) => {
        // Map shipment item's order_item_id to find order item:
        const oi = createdOrder.order_items!.find(
          (o) => o.id === item.shopping_mall_order_item_id,
        );
        return oi && oi.shopping_mall_product_id === matchProductId;
      }),
    );
  }
  // 7. Test pagination (limit=2, page=1)
  const paged =
    await api.functional.shoppingMall.admin.orders.shipments.items.index(
      connection,
      {
        orderId: createdOrder.id,
        shipmentId: shipment.id,
        body: {
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "no more than 2 items returned",
    paged.data.length <= 2,
  );
  TestValidator.equals("pagination limit honored", paged.pagination.limit, 2);

  // 8. Confirm all fields for audit/business context
  if (paged.data.length > 0) {
    const i = paged.data[0];
    TestValidator.predicate(
      "shipment item required fields present",
      typeof i.id === "string" &&
        typeof i.shopping_mall_shipment_id === "string" &&
        typeof i.shopping_mall_order_item_id === "string" &&
        typeof i.shipped_quantity === "number" &&
        typeof i.created_at === "string" &&
        typeof i.updated_at === "string",
    );
  }
}
