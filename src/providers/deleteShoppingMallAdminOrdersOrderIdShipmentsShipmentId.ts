import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { shipmentId, orderId, admin } = props;

  // 1. Find the shipment (must exist, not already deleted)
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: shipmentId,
      shopping_mall_order_id: orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment does not exist or already deleted", 404);
  }

  // 2. Cut-off: can't delete if shipped/delivered/etc
  const prohibited = ["shipped", "delivered"];
  if (prohibited.indexOf(shipment.status) !== -1) {
    throw new HttpException(
      "Cannot delete a shipment that has already been shipped or delivered.",
      400,
    );
  }

  // 3. Set deleted_at (soft delete)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: shipmentId },
    data: { deleted_at: deletedAt },
  });

  // 4. Audit compliance log
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "shipment",
      entity_id: shipmentId,
      event_type: "delete",
      actor_id: admin.id,
      event_result: "success",
      event_time: deletedAt,
      created_at: deletedAt,
    },
  });
}
