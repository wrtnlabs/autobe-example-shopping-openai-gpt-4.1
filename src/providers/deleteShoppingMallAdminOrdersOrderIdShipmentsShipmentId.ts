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
  // 1. Look up shipment record and validate existence
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: {
        id: props.shipmentId,
      },
    });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  if (shipment.shopping_mall_order_id !== props.orderId)
    throw new HttpException("Shipment does not belong to given order", 404);

  // 2. Business logic: cannot delete if delivered or refunded (the minimal rule is 'delivered'; add 'refunded' if used)
  // Schema has status: string, dispatched_at, delivered_at -- if delivered_at is set, always delivered.
  if (
    shipment.status === "delivered" ||
    shipment.status === "refunded" ||
    shipment.delivered_at
  )
    throw new HttpException(
      "Cannot delete shipment: already delivered, refunded, or protected for compliance.",
      400,
    );

  // 3. Hard delete: perform actual deletion
  await MyGlobal.prisma.shopping_mall_order_shipments.delete({
    where: {
      id: props.shipmentId,
    },
  });

  // 4. Audit log in admin action logs
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      affected_order_id: props.orderId,
      affected_customer_id: null,
      affected_seller_id: null,
      affected_product_id: null,
      affected_review_id: null,
      action_type: "erase_shipment",
      action_reason: "Permanently deleted order shipment by admin request.",
      domain: "order_shipment",
      details_json: JSON.stringify({
        order_id: props.orderId,
        shipment_id: props.shipmentId,
        status: shipment.status,
        delivered_at: shipment.delivered_at,
        deleted_at: now,
      }),
      created_at: now,
    },
  });
}
