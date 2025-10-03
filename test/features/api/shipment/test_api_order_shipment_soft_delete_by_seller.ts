import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate seller's ability to soft-delete (logical delete) their own shipment
 * associated with an order.
 *
 * - Register seller
 * - Create parent order (admin)
 * - Create shipment (admin), assign to seller, status 'pending'
 * - Authenticate as seller
 * - Soft-delete shipment (should succeed)
 * - Try deleting again (should error)
 * - Negative: Shipment status 'delivered' or 'shipped', then try delete (should
 *   error)
 * - Negative: Non-existent shipment (random UUID), try delete (should error)
 */
export async function test_api_order_shipment_soft_delete_by_seller(
  connection: api.IConnection,
) {
  // Prerequisites: generate random section/channel for seller+order
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerProfileName = RandomGenerator.name();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "12345",
        name: RandomGenerator.name(),
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        profile_name: sellerProfileName,
        // optional
        phone: RandomGenerator.mobile(),
        kyc_status: "pending",
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // Create parent order (admin)
  const orderCustomerId = typia.random<string & tags.Format<"uuid">>();
  const productId = typia.random<string & tags.Format<"uuid">>();
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: orderCustomerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        order_type: "normal",
        total_amount: 1000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "temporary", // Will be ignored on server side, OK for creation
            shopping_mall_product_id: productId,
            shopping_mall_seller_id: seller.id,
            quantity: 1 as number & tags.Type<"int32">,
            unit_price: 1000,
            final_price: 1000,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [
          {
            shopping_mall_order_id: "temporary",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: "Seoul",
            delivery_status: "prepared",
            delivery_attempts: 0 as number & tags.Type<"int32">,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: "temporary",
            shopping_mall_customer_id: orderCustomerId,
            payment_type: "card",
            status: "pending",
            amount: 1000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  const orderId = typia.assert(order.id);
  // Create shipment (admin), assign to seller
  const shipmentPayload = {
    shopping_mall_order_id: orderId,
    shopping_mall_seller_id: seller.id,
    shipment_code: RandomGenerator.alphaNumeric(10),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: orderId,
        body: shipmentPayload,
      },
    );
  typia.assert(shipment);
  // Switch authentication to seller (no need, already set by join)

  // Soft-delete shipment: should succeed
  await api.functional.shoppingMall.seller.orders.shipments.erase(connection, {
    orderId: orderId,
    shipmentId: shipment.id,
  });
  // Try deleting again: should error (already deleted)
  await TestValidator.error(
    "seller cannot soft-delete already deleted shipment",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: orderId,
          shipmentId: shipment.id,
        },
      );
    },
  );

  // Negative: create delivered shipment, try delete (should error)
  const deliveredShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: orderId,
        body: {
          shopping_mall_order_id: orderId,
          shopping_mall_seller_id: seller.id,
          shipment_code: RandomGenerator.alphaNumeric(10),
          status: "delivered",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(deliveredShipment);
  await TestValidator.error(
    "cannot soft-delete a delivered shipment",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: orderId,
          shipmentId: deliveredShipment.id,
        },
      );
    },
  );
  // Edge case: non-existent shipment
  await TestValidator.error(
    "cannot soft-delete non-existent shipment",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: orderId,
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
