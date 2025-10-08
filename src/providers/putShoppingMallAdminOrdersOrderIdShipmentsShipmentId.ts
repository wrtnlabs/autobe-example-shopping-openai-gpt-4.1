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

export async function putShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IUpdate;
}): Promise<IShoppingMallOrderShipment> {
  // 1. Fetch shipment by shipmentId
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: { id: props.shipmentId },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // 2. Verify shipment belongs to orderId
  if (shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      403,
    );
  }
  // 3. Business logic: status transition checks
  const allowedTransitions: Record<string, string[]> = {
    pending: ["shipped", "pending"],
    shipped: ["delivered", "shipped"],
    delivered: ["delivered"],
    cancelled: ["cancelled"],
    returned: ["returned", "delivered"],
    out_for_delivery: ["delivered", "out_for_delivery"],
    in_transit: ["out_for_delivery", "in_transit", "delivered"],
  };
  const oldStatus = shipment.status;
  const newStatus = props.body.status;
  if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
    throw new HttpException(
      `Invalid status transition from ${oldStatus} to ${newStatus}`,
      400,
    );
  }
  // If updating to 'shipped', dispatched_at must exist (input or already on record)
  if (
    newStatus === "shipped" &&
    !(props.body.dispatched_at ?? shipment.dispatched_at)
  ) {
    throw new HttpException(
      "dispatched_at must be set when status is shipped",
      400,
    );
  }
  // If updating to 'delivered', delivered_at must exist (input or already on record), cannot deliver before shipped
  if (newStatus === "delivered") {
    if (!(props.body.delivered_at ?? shipment.delivered_at)) {
      throw new HttpException(
        "delivered_at must be set when status is delivered",
        400,
      );
    }
    if (
      !["shipped", "out_for_delivery", "in_transit", "delivered"].includes(
        oldStatus,
      )
    ) {
      throw new HttpException(
        "Cannot mark as delivered unless already shipped",
        400,
      );
    }
  }
  // tracking_number required if status is shipped, delivered, out_for_delivery, in_transit
  if (
    ["shipped", "delivered", "out_for_delivery", "in_transit"].includes(
      newStatus,
    ) &&
    !(props.body.tracking_number ?? shipment.tracking_number)
  ) {
    throw new HttpException("tracking_number required for this status", 400);
  }
  // Compose update payload
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_order_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier: props.body.carrier,
      tracking_number: props.body.tracking_number ?? null,
      status: props.body.status,
      dispatched_at:
        props.body.dispatched_at !== undefined
          ? props.body.dispatched_at
          : (shipment.dispatched_at ?? null),
      delivered_at:
        props.body.delivered_at !== undefined
          ? props.body.delivered_at
          : (shipment.delivered_at ?? null),
      remark: props.body.remark ?? null,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shipment_number: updated.shipment_number,
    carrier: updated.carrier,
    tracking_number: updated.tracking_number ?? undefined,
    status: updated.status,
    dispatched_at:
      typeof updated.dispatched_at === "object" && updated.dispatched_at != null
        ? toISOStringSafe(updated.dispatched_at)
        : (updated.dispatched_at ?? undefined),
    delivered_at:
      typeof updated.delivered_at === "object" && updated.delivered_at != null
        ? toISOStringSafe(updated.delivered_at)
        : (updated.delivered_at ?? undefined),
    remark: updated.remark ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "object" && updated.deleted_at != null
        ? toISOStringSafe(updated.deleted_at)
        : (updated.deleted_at ?? undefined),
  };
}
