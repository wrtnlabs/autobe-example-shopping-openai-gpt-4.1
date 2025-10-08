import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdShipmentsShipmentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipment> {
  // Fetch shipment by shipmentId + orderId, not deleted
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // Fetch associated order (to validate owner and not deleted)
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: shipment.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Forbidden: Not your order", 403);
  }

  // Map fields to API structure, converting Dates
  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    shipment_number: shipment.shipment_number,
    carrier: shipment.carrier,
    tracking_number:
      shipment.tracking_number === null ? undefined : shipment.tracking_number,
    status: shipment.status,
    dispatched_at:
      shipment.dispatched_at == null
        ? undefined
        : toISOStringSafe(shipment.dispatched_at),
    delivered_at:
      shipment.delivered_at == null
        ? undefined
        : toISOStringSafe(shipment.delivered_at),
    remark: shipment.remark === null ? undefined : shipment.remark,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at:
      shipment.deleted_at == null
        ? undefined
        : toISOStringSafe(shipment.deleted_at),
  };
}
