import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipment> {
  // 1. Find the shipment by ID & parent orderId
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: { id: props.shipmentId },
    });
  if (!shipment || shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment not found", 404);
  }

  // 2. Find the order & verify seller ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  // 3. Map fields and return shipment info with proper date handling
  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    shipment_number: shipment.shipment_number,
    carrier: shipment.carrier,
    tracking_number: shipment.tracking_number ?? null,
    status: shipment.status,
    dispatched_at: shipment.dispatched_at
      ? toISOStringSafe(shipment.dispatched_at)
      : null,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null,
    remark: shipment.remark ?? null,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : null,
  };
}
