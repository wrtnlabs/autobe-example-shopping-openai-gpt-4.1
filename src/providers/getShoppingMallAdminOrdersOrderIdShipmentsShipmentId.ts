import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found for this order", 404);
  }
  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    shopping_mall_seller_id: shipment.shopping_mall_seller_id,
    shipment_code: shipment.shipment_code,
    external_tracking_number: shipment.external_tracking_number ?? undefined,
    status: shipment.status,
    carrier: shipment.carrier ?? undefined,
    requested_at: shipment.requested_at
      ? toISOStringSafe(shipment.requested_at)
      : null,
    shipped_at: shipment.shipped_at
      ? toISOStringSafe(shipment.shipped_at)
      : null,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : undefined,
  };
}
