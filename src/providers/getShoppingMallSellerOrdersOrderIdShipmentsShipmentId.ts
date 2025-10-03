import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const { seller, orderId, shipmentId } = props;
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: shipmentId,
      shopping_mall_order_id: orderId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  return {
    id: shipment.id,
    shopping_mall_order_id: shipment.shopping_mall_order_id,
    shopping_mall_seller_id: shipment.shopping_mall_seller_id,
    shipment_code: shipment.shipment_code,
    external_tracking_number: shipment.external_tracking_number ?? undefined,
    status: shipment.status,
    carrier: shipment.carrier ?? undefined,
    requested_at:
      shipment.requested_at != null
        ? toISOStringSafe(shipment.requested_at)
        : undefined,
    shipped_at:
      shipment.shipped_at != null
        ? toISOStringSafe(shipment.shipped_at)
        : undefined,
    delivered_at:
      shipment.delivered_at != null
        ? toISOStringSafe(shipment.delivered_at)
        : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
    deleted_at:
      shipment.deleted_at != null
        ? toISOStringSafe(shipment.deleted_at)
        : undefined,
  };
}
