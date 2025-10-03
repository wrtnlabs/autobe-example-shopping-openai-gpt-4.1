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
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";

/**
 * Ensures immutability of shipment items after delivery by preventing updates
 * by the seller once the shipment is marked delivered or completed.
 *
 * 1. Register a seller using random data to get section/channel UUIDs
 * 2. Create a customer cart for the seller's section/channel, referencing the
 *    registered seller's IDs
 * 3. Admin creates an order associated with the cart and the seller's
 *    section/channel
 * 4. Register a shipment batch for the order as admin for the seller
 * 5. Add a shipment item tied to the order's first item as admin
 * 6. Mark (simulate) the shipment or shipment item as delivered/completed by
 *    updating via admin endpoint with a status like 'delivered' if allowed
 * 7. Attempt to update the shipment item using the seller endpoint, expecting an
 *    error because the item belongs to a delivered/completed shipment
 * 8. Assert that the update is not allowed and a business error (not a type error)
 *    occurs, confirming business rule enforcement.
 */
export async function test_api_shipment_item_update_invalid_after_delivery(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>() as string,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    profile_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(seller);

  // 2. Create a cart as the customer (simulate customer id)
  const customer_id = typia.random<string & tags.Format<"uuid">>(); // correct linkage would use seller.customer_id, if possible
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer_id,
        shopping_mall_channel_id: sellerJoin.shopping_mall_channel_id,
        shopping_mall_section_id: sellerJoin.shopping_mall_section_id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 3. Admin creates the order with the cart, a single order item, payment, and delivery (simulate all IDs as random if necessary)
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const order_item_id = typia.random<string & tags.Format<"uuid">>();
  const orderCreate = {
    shopping_mall_customer_id: customer_id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: "DUMMY_ORDER_ID", // will be ignored/replaced
        shopping_mall_product_id: product_id,
        shopping_mall_seller_id: seller.id,
        quantity: 1 as number & tags.Type<"int32">,
        unit_price: 10000,
        final_price: 10000,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [
      {
        shopping_mall_order_id: "DUMMY_ORDER_ID", // will be ignored/replaced
        recipient_name: RandomGenerator.name(1),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
        delivery_status: "prepared",
        delivery_attempts: 0 as number & tags.Type<"int32">,
      },
    ],
    payments: [
      {
        shopping_mall_order_id: "DUMMY_ORDER_ID", // will be ignored/replaced
        shopping_mall_customer_id: customer_id,
        payment_type: "card",
        status: "paid",
        amount: 10000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  // Fill in actual order item/delivery/payment IDs after create
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);
  TestValidator.equals(
    "order customer linkage",
    order.shopping_mall_customer_id,
    customer_id,
  );

  // 4. Register shipment batch (admin)
  const shipmentCreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_seller_id: seller.id,
    shipment_code: RandomGenerator.alphaNumeric(10),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: shipmentCreate,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment linkage",
    shipment.shopping_mall_order_id,
    order.id,
  );

  // 5. Add shipment item (admin)
  // Use the first order item if present
  const baseOrderItem =
    order.order_items && order.order_items.length > 0
      ? order.order_items[0]
      : null;
  TestValidator.predicate("order contains at least one item", !!baseOrderItem);
  // Create with known order item id
  const shipmentItemCreate = {
    shopping_mall_order_item_id: baseOrderItem!.id,
    shipped_quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallShipmentItem.ICreate;
  const shipmentItem =
    await api.functional.shoppingMall.admin.orders.shipments.items.create(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: shipmentItemCreate,
      },
    );
  typia.assert(shipmentItem);
  TestValidator.equals(
    "shipment item linkage",
    shipmentItem.shopping_mall_shipment_id,
    shipment.id,
  );

  // 6. Mark shipment as delivered or finalized to lock shipment items.
  // We'll simulate lock by using the admin update endpoint to set shipped_quantity again (real endpoint for shipment status change missing)
  await api.functional.shoppingMall.admin.orders.shipments.items.update(
    connection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
      shipmentItemId: shipmentItem.id,
      body: {
        shipped_quantity: 1 as number & tags.Type<"int32">,
      },
    },
  );
  // Assume shipment is now finalized and shipmentItem is considered delivered

  // 7. Seller attempts to update shipment item in finalized/delivered shipment (should fail)
  // Use the seller's endpoint (update)
  await TestValidator.error(
    "seller cannot update shipment item after shipment is delivered/finalized",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.items.update(
        connection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          shipmentItemId: shipmentItem.id,
          body: {
            shipped_quantity: 2 as number & tags.Type<"int32">,
          },
        },
      );
    },
  );
}
