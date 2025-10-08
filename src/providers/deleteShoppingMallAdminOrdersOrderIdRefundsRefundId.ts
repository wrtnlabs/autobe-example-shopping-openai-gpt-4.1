import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdRefundsRefundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Validate refund exists and belongs to order
  const refund = await MyGlobal.prisma.shopping_mall_order_refunds.findUnique({
    where: { id: props.refundId },
  });
  if (!refund || refund.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Refund not found", 404);
  }

  // 3. Check that refund is not finalized/protected (settled_at or finalized status)
  const finalizedStatuses = ["completed", "approved", "denied", "failed"];
  if (
    (refund.settled_at !== null && refund.settled_at !== undefined) ||
    finalizedStatuses.includes(refund.status)
  ) {
    throw new HttpException("Cannot erase finalized or immutable refund", 409);
  }

  // 4. Hard delete refund entry
  await MyGlobal.prisma.shopping_mall_order_refunds.delete({
    where: { id: props.refundId },
  });

  // 5. Log admin action
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      affected_order_id: props.orderId,
      action_type: "erase_refund",
      action_reason: "Admin erased refund via compliance endpoint.",
      domain: "order_refund",
      details_json: JSON.stringify({
        orderId: props.orderId,
        refundId: props.refundId,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
