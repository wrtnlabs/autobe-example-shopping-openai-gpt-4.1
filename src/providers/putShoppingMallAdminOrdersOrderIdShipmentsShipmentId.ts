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

export async function putShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  // Find shipment (must belong to this order, not soft-deleted)
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!shipment) throw new HttpException("Shipment not found for order", 404);
  // Status 'delivered' or 'cancelled' are immutable for business compliance
  const isFinal =
    shipment.status === "delivered" || shipment.status === "cancelled";
  if (isFinal) {
    if (
      props.body.status !== undefined &&
      props.body.status !== shipment.status
    )
      throw new HttpException(
        "Cannot change shipment status after delivered/cancelled",
        400,
      );
    if (
      props.body.shipped_at !== undefined ||
      props.body.delivered_at !== undefined ||
      props.body.carrier !== undefined ||
      props.body.external_tracking_number !== undefined ||
      props.body.requested_at !== undefined
    ) {
      throw new HttpException(
        "Cannot update shipment after delivered/cancelled",
        400,
      );
    }
  }
  // Only allow legitimate shipment changes, skip immutable keys
  const now = toISOStringSafe(new Date());
  const update: Record<string, unknown> = {
    updated_at: now,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.carrier !== undefined
      ? { carrier: props.body.carrier }
      : {}),
    ...(props.body.external_tracking_number !== undefined
      ? { external_tracking_number: props.body.external_tracking_number }
      : {}),
    ...(props.body.requested_at !== undefined
      ? { requested_at: props.body.requested_at ?? null }
      : {}),
    ...(props.body.shipped_at !== undefined
      ? { shipped_at: props.body.shipped_at ?? null }
      : {}),
    ...(props.body.delivered_at !== undefined
      ? { delivered_at: props.body.delivered_at ?? null }
      : {}),
  };
  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: shipment.id },
    data: update,
  });
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    shipment_code: updated.shipment_code,
    external_tracking_number: updated.external_tracking_number ?? undefined,
    status: updated.status,
    carrier: updated.carrier ?? undefined,
    requested_at:
      updated.requested_at !== null && updated.requested_at !== undefined
        ? toISOStringSafe(updated.requested_at)
        : undefined,
    shipped_at:
      updated.shipped_at !== null && updated.shipped_at !== undefined
        ? toISOStringSafe(updated.shipped_at)
        : undefined,
    delivered_at:
      updated.delivered_at !== null && updated.delivered_at !== undefined
        ? toISOStringSafe(updated.delivered_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
