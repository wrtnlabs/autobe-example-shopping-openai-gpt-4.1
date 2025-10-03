import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch order and ensure existence and not already deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found or already deleted", 404);
  }
  // Step 2: Enforce business rules on order status
  const forbiddenStatuses = [
    "completed",
    "delivered",
    "cancelled",
    "in_fulfillment",
    "shipping",
  ];
  if (forbiddenStatuses.includes(order.status)) {
    throw new HttpException(
      "Order cannot be deleted in its current status",
      400,
    );
  }
  // Step 3: Create a snapshot record for audit/evidence
  await MyGlobal.prisma.shopping_mall_order_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      snapshot_data: JSON.stringify(order),
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Step 4: Set deleted_at field (soft delete)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: { deleted_at: now },
  });
  // Step 5: Audit log for compliance
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "order",
      entity_id: order.id,
      event_type: "soft_delete",
      actor_id: props.admin.id,
      event_result: "success",
      event_time: now,
      created_at: now,
    },
  });
}
