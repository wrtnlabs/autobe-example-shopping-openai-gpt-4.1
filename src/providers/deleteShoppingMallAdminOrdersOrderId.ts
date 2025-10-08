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
  const { admin, orderId } = props;

  // 1. Find order by ID and ensure not already deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found, or already deleted.", 404);
  }

  // 2. Check order status is eligible for deletion
  const allowedStatuses = ["completed", "cancelled", "refunded"];
  if (!allowedStatuses.includes(order.status)) {
    throw new HttpException("Order status does not allow deletion.", 409);
  }

  // 3. Soft delete order
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: orderId },
    data: { deleted_at: deletedAt },
  });

  // 4. Create admin action log
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      affected_order_id: orderId,
      action_type: "soft_delete",
      domain: "order",
      action_reason: "Order soft deleted via admin operation.",
      created_at: deletedAt,
    },
  });
}
