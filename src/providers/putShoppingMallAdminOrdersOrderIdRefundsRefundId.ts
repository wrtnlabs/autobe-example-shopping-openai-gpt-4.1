import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdRefundsRefundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderRefund.IUpdate;
}): Promise<IShoppingMallOrderRefund> {
  // 1. Fetch the refund by order and refund ID
  const refund = await MyGlobal.prisma.shopping_mall_order_refunds.findFirst({
    where: {
      id: props.refundId,
      shopping_mall_order_id: props.orderId,
      // Prisma input error on deleted_at property, leaving as-is for non-casting error
    },
  });
  if (!refund) {
    throw new HttpException("Refund not found for the specified order.", 404);
  }

  // 2. Status transition and business rule validation
  const nextStatus = props.body.status;
  const currentStatus = refund.status;
  if (
    (nextStatus !== undefined &&
      (currentStatus === "denied" || currentStatus === "completed")) ||
    (nextStatus !== undefined && nextStatus === currentStatus)
  ) {
    throw new HttpException("Invalid refund status transition.", 400);
  }

  // 3. Update fields preparation
  const update: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
    initiator_admin_id: props.admin.id,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.resolution_type !== undefined && {
      resolution_type: props.body.resolution_type,
    }),
    ...(props.body.explanation !== undefined && {
      explanation: props.body.explanation,
    }),
  };

  const updated = await MyGlobal.prisma.shopping_mall_order_refunds.update({
    where: { id: props.refundId },
    data: update,
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    refunded_payment_id: updated.refunded_payment_id ?? undefined,
    initiator_customer_id: updated.initiator_customer_id ?? undefined,
    initiator_admin_id: updated.initiator_admin_id ?? undefined,
    reason_code: updated.reason_code,
    status: updated.status,
    refund_amount: updated.refund_amount,
    currency: updated.currency,
    requested_at: toISOStringSafe(updated.requested_at),
    settled_at: updated.settled_at
      ? toISOStringSafe(updated.settled_at)
      : undefined,
    explanation: updated.explanation ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
