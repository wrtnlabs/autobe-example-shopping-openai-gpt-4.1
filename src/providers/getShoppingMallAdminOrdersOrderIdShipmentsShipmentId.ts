import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderShipment> {
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
  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    shipment_number: shipment.shipment_number,
    carrier: shipment.carrier,
    tracking_number:
      shipment.tracking_number === undefined
        ? undefined
        : (shipment.tracking_number ?? null),
    status: shipment.status,
    dispatched_at: shipment.dispatched_at
      ? toISOStringSafe(shipment.dispatched_at)
      : undefined,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : undefined,
    remark:
      shipment.remark === undefined ? undefined : (shipment.remark ?? null),
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : undefined,
  };
}
